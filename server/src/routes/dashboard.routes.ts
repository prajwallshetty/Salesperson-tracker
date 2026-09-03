import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "../utils/dates";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const [
      totalSalespersons,
      activeSalespersons,
      todaySalesAgg,
      monthlySalesAgg,
      todayVisits,
      pendingFollowups,
      todayOrdersCount,
      todayCollectionsAgg,
      activeTargets,
    ] = await Promise.all([
      prisma.salesperson.count(),
      prisma.salesperson.count({ where: { status: "ACTIVE" } }),
      prisma.order.aggregate({ where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } }, _sum: { grandTotal: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } }, _sum: { grandTotal: true } }),
      prisma.visit.count({ where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
      prisma.followUp.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
      prisma.collection.aggregate({ where: { collectedAt: { gte: startOfDay(now), lte: endOfDay(now) } }, _sum: { amount: true } }),
      prisma.target.findMany({ where: { periodStart: { lte: now }, periodEnd: { gte: now } } }),
    ]);

    const targetAmount = activeTargets.reduce((s, t) => s + t.targetAmount, 0);
    const achievement = monthlySalesAgg._sum.grandTotal ?? 0;

    const topPerformersRaw = await prisma.order.groupBy({
      by: ["salespersonId"],
      where: { createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 5,
    });
    const topSpIds = topPerformersRaw.map((t) => t.salespersonId);
    const topSps = await prisma.salesperson.findMany({
      where: { id: { in: topSpIds } },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
    const topPerformers = topPerformersRaw.map((t) => {
      const sp = topSps.find((s) => s.id === t.salespersonId);
      return { salespersonId: t.salespersonId, name: sp?.user.name ?? "Unknown", avatarUrl: sp?.user.avatarUrl ?? null, sales: t._sum.grandTotal ?? 0 };
    });

    res.json({
      totalSalespersons,
      activeSalespersons,
      todaySales: todaySalesAgg._sum.grandTotal ?? 0,
      monthlySales: monthlySalesAgg._sum.grandTotal ?? 0,
      todayVisits,
      pendingFollowups,
      todayOrdersCount,
      todayCollections: todayCollectionsAgg._sum.amount ?? 0,
      targetAmount,
      achievement,
      achievementPercent: targetAmount > 0 ? Math.round((achievement / targetAmount) * 100) : 0,
      topPerformers,
    });
  })
);

router.get(
  "/salespersons",
  asyncHandler(async (req, res) => {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    const items = await prisma.salesperson.findMany({
      where,
      include: { user: { select: { name: true, email: true, avatarUrl: true } }, territory: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  })
);

router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const range = (req.query.range as string) || "today";
    const now = new Date();
    const gte = range === "month" ? startOfMonth(now) : startOfDay(now);
    const lte = range === "month" ? endOfMonth(now) : endOfDay(now);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte, lte } },
      include: { customer: true, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  })
);

router.get(
  "/visits",
  asyncHandler(async (req, res) => {
    const range = (req.query.range as string) || "today";
    const now = new Date();
    const gte = range === "month" ? startOfMonth(now) : startOfDay(now);
    const lte = range === "month" ? endOfMonth(now) : endOfDay(now);
    const visits = await prisma.visit.findMany({
      where: { createdAt: { gte, lte } },
      include: { customer: true, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(visits);
  })
);

router.get(
  "/followups",
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || "PENDING";
    const where: any = {};
    if (status === "OVERDUE") {
      where.status = "PENDING";
      where.dueDate = { lt: new Date() };
    } else {
      where.status = status;
    }
    const followUps = await prisma.followUp.findMany({
      where,
      include: { customer: true, lead: true, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    });
    res.json(followUps);
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const range = (req.query.range as string) || "today";
    const now = new Date();
    const gte = range === "month" ? startOfMonth(now) : startOfDay(now);
    const lte = range === "month" ? endOfMonth(now) : endOfDay(now);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte, lte } },
      include: { customer: true, items: { include: { product: true } }, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  })
);

router.get(
  "/collections",
  asyncHandler(async (req, res) => {
    const range = (req.query.range as string) || "today";
    const now = new Date();
    const gte = range === "month" ? startOfMonth(now) : startOfDay(now);
    const lte = range === "month" ? endOfMonth(now) : endOfDay(now);
    const collections = await prisma.collection.findMany({
      where: { collectedAt: { gte, lte } },
      include: { customer: true, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { collectedAt: "desc" },
    });
    res.json(collections);
  })
);

router.get(
  "/targets",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const defaultRange = { gte: startOfMonth(now), lte: endOfMonth(now) };
    const salespersons = await prisma.salesperson.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true, avatarUrl: true } }, targets: { where: { periodStart: { lte: now }, periodEnd: { gte: now } } } },
    });

    // Each salesperson's achievement window is usually the same current-month range, but a
    // target can define a custom periodStart/periodEnd, so group salespersons by their actual
    // window and issue one aggregate per distinct window instead of one per salesperson.
    const spInfo = salespersons.map((sp) => {
      const target = sp.targets.find((t) => t.period === "MONTHLY") ?? sp.targets[0];
      const range = target ? { gte: target.periodStart, lte: target.periodEnd } : defaultRange;
      return { sp, target, range, rangeKey: `${range.gte.getTime()}_${range.lte.getTime()}` };
    });
    const rangeGroups = new Map<string, { gte: Date; lte: Date; salespersonIds: string[] }>();
    for (const info of spInfo) {
      const group = rangeGroups.get(info.rangeKey);
      if (group) group.salespersonIds.push(info.sp.id);
      else rangeGroups.set(info.rangeKey, { gte: info.range.gte, lte: info.range.lte, salespersonIds: [info.sp.id] });
    }

    const achievedMap = new Map<string, number>();
    await Promise.all(
      Array.from(rangeGroups.values()).map(async (group) => {
        const grouped = await prisma.order.groupBy({
          by: ["salespersonId"],
          where: { salespersonId: { in: group.salespersonIds }, createdAt: { gte: group.gte, lte: group.lte } },
          _sum: { grandTotal: true },
        });
        for (const row of grouped) achievedMap.set(row.salespersonId, row._sum.grandTotal ?? 0);
      })
    );

    const results = spInfo.map(({ sp, target }) => {
      const achieved = achievedMap.get(sp.id) ?? 0;
      const targetAmount = target?.targetAmount ?? 0;
      return {
        salespersonId: sp.id,
        name: sp.user.name,
        avatarUrl: sp.user.avatarUrl,
        targetAmount,
        achieved,
        percent: targetAmount > 0 ? Math.round((achieved / targetAmount) * 100) : 0,
      };
    });
    res.json(results);
  })
);

router.get(
  "/top-performers",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const range = (req.query.range as string) || "month";
    const gte = range === "today" ? startOfDay(now) : startOfMonth(now);
    const lte = range === "today" ? endOfDay(now) : endOfMonth(now);
    const grouped = await prisma.order.groupBy({
      by: ["salespersonId"],
      where: { createdAt: { gte, lte } },
      _sum: { grandTotal: true },
      _count: true,
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 10,
    });
    const sps = await prisma.salesperson.findMany({
      where: { id: { in: grouped.map((g) => g.salespersonId) } },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
    const result = grouped.map((g) => {
      const sp = sps.find((s) => s.id === g.salespersonId);
      return {
        salespersonId: g.salespersonId,
        name: sp?.user.name ?? "Unknown",
        avatarUrl: sp?.user.avatarUrl ?? null,
        sales: g._sum.grandTotal ?? 0,
        orders: g._count,
      };
    });
    res.json(result);
  })
);

export default router;
