import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { startOfMonth, endOfMonth } from "../utils/dates";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const territories = await prisma.territory.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { _count: { select: { salespersons: true, customers: true } } },
      orderBy: { name: "asc" },
    });
    res.json(territories);
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { name, description } = z.object({ name: z.string().min(1), description: z.string().optional() }).parse(req.body);
    const territory = await prisma.territory.create({ data: { tenantId, name, description } });
    res.status(201).json(territory);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { name, description } = z
      .object({ name: z.string().min(1).optional(), description: z.string().optional() })
      .parse(req.body);
    const existing = await prisma.territory.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const territory = await prisma.territory.update({ where: { id: req.params.id }, data: { name, description } });
    res.json(territory);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.territory.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.territory.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

router.get(
  "/:id/performance",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const territoryId = req.params.id;
    const territory = await prisma.territory.findFirst({ where: { id: territoryId, tenantId } });
    if (!territory) return res.status(404).json({ error: "Not found" });

    const now = new Date();
    const monthRange = { gte: startOfMonth(now), lte: endOfMonth(now) };

    const salespersons = await prisma.salesperson.findMany({
      where: { tenantId, territoryId },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
    const ids = salespersons.map((sp) => sp.id);

    // Batch every per-salesperson metric into one grouped query each instead of N queries per
    // salesperson (matches the batching pattern already used in tracking.routes.ts/performance.routes.ts).
    const [salesAgg, visitCounts, collectionAgg, targets, customerCount] = await Promise.all([
      prisma.order.groupBy({ by: ["salespersonId"], where: { tenantId, salespersonId: { in: ids }, createdAt: monthRange }, _sum: { grandTotal: true }, _count: true }),
      prisma.visit.groupBy({ by: ["salespersonId"], where: { tenantId, salespersonId: { in: ids }, createdAt: monthRange }, _count: true }),
      prisma.collection.groupBy({ by: ["salespersonId"], where: { tenantId, salespersonId: { in: ids }, collectedAt: monthRange }, _sum: { amount: true } }),
      prisma.target.findMany({ where: { tenantId, salespersonId: { in: ids }, periodStart: { lte: now }, periodEnd: { gte: now } } }),
      prisma.customer.count({ where: { tenantId, territoryId } }),
    ]);

    const salesMap = new Map(salesAgg.map((s) => [s.salespersonId, { sum: s._sum.grandTotal ?? 0, count: s._count }]));
    const visitMap = new Map(visitCounts.map((v) => [v.salespersonId, v._count]));
    const collectionMap = new Map(collectionAgg.map((c) => [c.salespersonId, c._sum.amount ?? 0]));
    const targetMap = new Map<string, number>();
    for (const t of targets) targetMap.set(t.salespersonId, (targetMap.get(t.salespersonId) ?? 0) + t.targetAmount);

    const salespersonRows = salespersons.map((sp) => {
      const sales = salesMap.get(sp.id)?.sum ?? 0;
      const targetAmount = targetMap.get(sp.id) ?? 0;
      return {
        salespersonId: sp.id,
        name: sp.user.name,
        avatarUrl: sp.user.avatarUrl,
        sales,
        orders: salesMap.get(sp.id)?.count ?? 0,
        visits: visitMap.get(sp.id) ?? 0,
        collections: collectionMap.get(sp.id) ?? 0,
        targetAmount,
        achievementPercent: targetAmount > 0 ? Math.round((sales / targetAmount) * 100) : 0,
      };
    });

    const totals = salespersonRows.reduce(
      (acc, r) => ({
        sales: acc.sales + r.sales,
        orders: acc.orders + r.orders,
        visits: acc.visits + r.visits,
        collections: acc.collections + r.collections,
        targetAmount: acc.targetAmount + r.targetAmount,
      }),
      { sales: 0, orders: 0, visits: 0, collections: 0, targetAmount: 0 }
    );

    res.json({
      territoryId,
      territoryName: territory.name,
      salespersonCount: salespersons.length,
      customerCount,
      period: { gte: monthRange.gte, lte: monthRange.lte },
      totals: {
        ...totals,
        achievementPercent: totals.targetAmount > 0 ? Math.round((totals.sales / totals.targetAmount) * 100) : 0,
      },
      salespersons: salespersonRows,
    });
  })
);

export default router;
