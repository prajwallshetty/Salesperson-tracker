import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth } from "../utils/dates";

const router = Router();
router.use(requireAuth);

router.get(
  "/:salespersonId",
  asyncHandler(async (req, res) => {
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.salespersonId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const id = req.params.salespersonId;
    const now = new Date();

    const [
      dailySales,
      weeklySales,
      monthlySales,
      monthlyOrders,
      monthlyVisits,
      newCustomers,
      followUpsCompleted,
      monthlyCollections,
      attendanceRows,
      target,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { salespersonId: id, createdAt: { gte: startOfDay(now), lte: endOfDay(now) } }, _sum: { grandTotal: true } }),
      prisma.order.aggregate({ where: { salespersonId: id, createdAt: { gte: startOfWeek(now) } }, _sum: { grandTotal: true } }),
      prisma.order.aggregate({ where: { salespersonId: id, createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } }, _sum: { grandTotal: true }, _count: true }),
      prisma.order.count({ where: { salespersonId: id, createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } } }),
      prisma.visit.count({ where: { salespersonId: id, createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } } }),
      prisma.customer.count({ where: { salespersonId: id, createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } } }),
      prisma.followUp.count({ where: { salespersonId: id, status: "COMPLETED", completedAt: { gte: startOfMonth(now), lte: endOfMonth(now) } } }),
      prisma.collection.aggregate({ where: { salespersonId: id, collectedAt: { gte: startOfMonth(now), lte: endOfMonth(now) } }, _sum: { amount: true } }),
      prisma.attendance.findMany({ where: { salespersonId: id, date: { gte: startOfMonth(now), lte: endOfMonth(now) } } }),
      prisma.target.findFirst({ where: { salespersonId: id, periodStart: { lte: now }, periodEnd: { gte: now }, period: "MONTHLY" } }),
    ]);

    const totalDistanceKm = attendanceRows.reduce((s, a) => s + a.totalDistanceKm, 0);
    const workingHours = attendanceRows.reduce((s, a) => s + a.totalDurationMin, 0) / 60;
    const avgOrderValue = monthlyOrders > 0 ? (monthlySales._sum.grandTotal ?? 0) / monthlyOrders : 0;

    res.json({
      dailySales: dailySales._sum.grandTotal ?? 0,
      weeklySales: weeklySales._sum.grandTotal ?? 0,
      monthlySales: monthlySales._sum.grandTotal ?? 0,
      targetAmount: target?.targetAmount ?? 0,
      achievementPercent: target ? Math.round(((monthlySales._sum.grandTotal ?? 0) / target.targetAmount) * 100) : 0,
      monthlyOrders,
      monthlyVisits,
      newCustomers,
      followUpsCompleted,
      monthlyCollections: monthlyCollections._sum.amount ?? 0,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      workingHours: Math.round(workingHours * 10) / 10,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const range = (req.query.range as string) || "month";
    const gte = range === "today" ? startOfDay(now) : range === "week" ? startOfWeek(now) : startOfMonth(now);
    const lte = range === "today" ? endOfDay(now) : range === "week" ? now : endOfMonth(now);

    const salespersons = await prisma.salesperson.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
    const ids = salespersons.map((sp) => sp.id);

    // Batch the per-salesperson sales/visits/collections stats into one grouped query each
    // instead of 3 queries per salesperson - this leaderboard is fetched by every user's app.
    const [salesAggs, visitCounts, collectionAggs] = await Promise.all([
      prisma.order.groupBy({ by: ["salespersonId"], where: { salespersonId: { in: ids }, createdAt: { gte, lte } }, _sum: { grandTotal: true }, _count: true }),
      prisma.visit.groupBy({ by: ["salespersonId"], where: { salespersonId: { in: ids }, createdAt: { gte, lte } }, _count: true }),
      prisma.collection.groupBy({ by: ["salespersonId"], where: { salespersonId: { in: ids }, collectedAt: { gte, lte } }, _sum: { amount: true } }),
    ]);

    const salesMap = new Map(salesAggs.map((s) => [s.salespersonId, { sum: s._sum.grandTotal ?? 0, count: s._count }]));
    const visitMap = new Map(visitCounts.map((v) => [v.salespersonId, v._count]));
    const collectionMap = new Map(collectionAggs.map((c) => [c.salespersonId, c._sum.amount ?? 0]));

    const ranking = salespersons.map((sp) => {
      const sales = salesMap.get(sp.id);
      return {
        salespersonId: sp.id,
        name: sp.user.name,
        avatarUrl: sp.user.avatarUrl,
        sales: sales?.sum ?? 0,
        orders: sales?.count ?? 0,
        visits: visitMap.get(sp.id) ?? 0,
        collections: collectionMap.get(sp.id) ?? 0,
      };
    });

    ranking.sort((a, b) => b.sales - a.sales);
    res.json(ranking.map((r, i) => ({ ...r, rank: i + 1 })));
  })
);

export default router;
