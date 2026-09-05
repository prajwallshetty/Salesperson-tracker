import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireActiveSubscription, requireFeature } from "../lib/entitlements";

const router = Router();
// Admin-wide target listing/editing exposes every salesperson's targets, so gate the whole
// router to ADMIN (per-salesperson target read/create already exists at
// GET/POST /api/salespersons/:id/targets, available to admins and the salesperson themself -
// gated the same way there for consistency).
router.use(requireAuth, requireRole("ADMIN"), requireActiveSubscription(), requireFeature("TARGET_ANALYTICS"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { salespersonId, territoryId, period, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (salespersonId) where.salespersonId = salespersonId;
    if (period) where.period = period;
    if (territoryId) where.salesperson = { territoryId };

    const take = Math.min(parseInt(pageSize, 10) || 20, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.target.findMany({
        where,
        include: {
          salesperson: { include: { user: { select: { name: true } }, territory: { select: { id: true, name: true } } } },
        },
        orderBy: { periodStart: "desc" },
        take,
        skip,
      }),
      prisma.target.count({ where }),
    ]);

    const shaped = items.map((t) => ({
      id: t.id,
      salespersonId: t.salespersonId,
      salespersonName: t.salesperson.user.name,
      territory: t.salesperson.territory?.name ?? null,
      period: t.period,
      periodStart: t.periodStart,
      periodEnd: t.periodEnd,
      targetAmount: t.targetAmount,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    res.json({ items: shaped, total, page: Number(page), pageSize: take });
  })
);

const updateSchema = z.object({
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  targetAmount: z.number().positive().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.target.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const target = await prisma.target.update({
      where: { id: req.params.id },
      data: {
        period: data.period,
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        targetAmount: data.targetAmount,
      },
    });
    res.json(target);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.target.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.target.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
