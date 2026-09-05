import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireActiveSubscription, requireFeature } from "../lib/entitlements";
import { createSalespersonAccount } from "../services/accounts";
import { SAFE_USER_SELECT } from "../lib/selects";
import { generateUniqueAccessCode } from "../lib/accessCode";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "../utils/dates";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { status, territoryId, managerId, search, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (territoryId) where.territoryId = territoryId;
    if (managerId) where.managerId = managerId;
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }
    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.salesperson.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          territory: true,
          manager: { include: { user: { select: { name: true } } } },
          _count: { select: { customers: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.salesperson.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  employeeCode: z.string().min(1),
  territoryId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = createSchema.parse(req.body);
    if (data.territoryId) {
      const territory = await prisma.territory.findFirst({ where: { id: data.territoryId, tenantId } });
      if (!territory) return res.status(400).json({ error: "Territory not found" });
    }
    if (data.managerId) {
      const manager = await prisma.salesperson.findFirst({ where: { id: data.managerId, tenantId } });
      if (!manager) return res.status(400).json({ error: "Manager not found" });
    }
    const salesperson = await createSalespersonAccount(tenantId, data);
    // The admin who just created this account needs to see the generated access code once.
    res.locals.allowAccessCode = true;
    res.status(201).json(salesperson);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const sp = await prisma.salesperson.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        territory: true,
        manager: { include: { user: { select: { name: true } } } },
        _count: { select: { customers: true, visits: true, orders: true } },
      },
    });
    if (!sp) return res.status(404).json({ error: "Not found" });
    res.json(sp);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  territoryId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
});

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = updateSchema.parse(req.body);
    const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (data.territoryId) {
      const territory = await prisma.territory.findFirst({ where: { id: data.territoryId, tenantId } });
      if (!territory) return res.status(400).json({ error: "Territory not found" });
    }
    if (data.managerId) {
      const manager = await prisma.salesperson.findFirst({ where: { id: data.managerId, tenantId } });
      if (!manager) return res.status(400).json({ error: "Manager not found" });
    }

    if (data.name !== undefined || data.phone !== undefined) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { name: data.name, phone: data.phone },
      });
    }

    const sp = await prisma.salesperson.update({
      where: { id: req.params.id },
      data: {
        employeeCode: data.employeeCode,
        territoryId: data.territoryId,
        managerId: data.managerId,
      },
      include: { user: { select: SAFE_USER_SELECT }, territory: true },
    });
    res.json(sp);
  })
);

router.patch(
  "/:id/status",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) }).parse(req.body);
    const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const sp = await prisma.salesperson.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(sp);
  })
);

// Admin-only: the general GET /:id above returns a raw Salesperson via `redactAccessCode`
// (registered globally in index.ts), which strips accessCode from every response by default.
// These three dedicated endpoints are the only place the real value is legitimately needed
// (view/copy, regenerate, enable/disable), so they explicitly opt back in.
router.get(
  "/:id/access-code",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const sp = await prisma.salesperson.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      select: { accessCode: true, accessCodeEnabled: true, accessCodeLastUsedAt: true },
    });
    if (!sp) return res.status(404).json({ error: "Not found" });
    res.locals.allowAccessCode = true;
    res.json(sp);
  })
);

router.post(
  "/:id/access-code/regenerate",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const accessCode = await generateUniqueAccessCode();
    const sp = await prisma.salesperson.update({
      where: { id: req.params.id },
      data: { accessCode, accessCodeEnabled: true, accessCodeLastUsedAt: null },
      select: { accessCode: true, accessCodeEnabled: true, accessCodeLastUsedAt: true },
    });
    res.locals.allowAccessCode = true;
    res.json(sp);
  })
);

router.patch(
  "/:id/access-code",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const sp = await prisma.salesperson.update({
      where: { id: req.params.id },
      data: { accessCodeEnabled: enabled },
      select: { accessCode: true, accessCodeEnabled: true, accessCodeLastUsedAt: true },
    });
    res.locals.allowAccessCode = true;
    res.json(sp);
  })
);

router.post(
  "/:id/assign-customers",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { customerIds } = z.object({ customerIds: z.array(z.string()) }).parse(req.body);
    const salesperson = await prisma.salesperson.findFirst({ where: { id: req.params.id, tenantId } });
    if (!salesperson) return res.status(404).json({ error: "Not found" });
    // updateMany's where also carries tenantId, so a customerId belonging to another tenant
    // simply doesn't match and is silently skipped rather than reassigned.
    const result = await prisma.customer.updateMany({
      where: { id: { in: customerIds }, tenantId },
      data: { salespersonId: req.params.id },
    });
    res.json({ ok: true, count: result.count });
  })
);

router.post(
  "/:id/targets",
  requireRole("ADMIN"),
  requireActiveSubscription(),
  requireFeature("targets"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { period, periodStart, periodEnd, targetAmount } = z
      .object({
        period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
        periodStart: z.string(),
        periodEnd: z.string(),
        targetAmount: z.number().positive(),
      })
      .parse(req.body);
    const salesperson = await prisma.salesperson.findFirst({ where: { id: req.params.id, tenantId } });
    if (!salesperson) return res.status(404).json({ error: "Not found" });
    const target = await prisma.target.create({
      data: {
        tenantId,
        salespersonId: req.params.id,
        period,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        targetAmount,
      },
    });
    res.status(201).json(target);
  })
);

router.get(
  "/:id/targets",
  requireActiveSubscription(),
  requireFeature("targets"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const targets = await prisma.target.findMany({
      where: { salespersonId: req.params.id, tenantId },
      orderBy: { periodStart: "desc" },
    });
    res.json(targets);
  })
);

router.get(
  "/:id/attendance",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const records = await prisma.attendance.findMany({
      where: { salespersonId: req.params.id, tenantId },
      orderBy: { date: "desc" },
      take: 60,
    });
    res.json(records);
  })
);

router.get(
  "/:id/visits",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const visits = await prisma.visit.findMany({
      where: { salespersonId: req.params.id, tenantId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(visits);
  })
);

router.get(
  "/:id/orders",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const orders = await prisma.order.findMany({
      where: { salespersonId: req.params.id, tenantId },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(orders);
  })
);

router.get(
  "/:id/collections",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const collections = await prisma.collection.findMany({
      where: { salespersonId: req.params.id, tenantId },
      include: { customer: true },
      orderBy: { collectedAt: "desc" },
      take: 100,
    });
    res.json(collections);
  })
);

router.get(
  "/:id/customers",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const customers = await prisma.customer.findMany({
      where: { salespersonId: req.params.id, tenantId },
      orderBy: { name: "asc" },
    });
    res.json(customers);
  })
);

router.get(
  "/:id/performance-summary",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const id = req.params.id;
    const salesperson = await prisma.salesperson.findFirst({ where: { id, tenantId } });
    if (!salesperson) return res.status(404).json({ error: "Not found" });
    const now = new Date();
    const [todayOrders, monthOrders, visitsToday, followupsPending, collectionsMonth] = await Promise.all([
      prisma.order.aggregate({
        where: { salespersonId: id, createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { salespersonId: id, createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.visit.count({
        where: { salespersonId: id, createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      prisma.followUp.count({ where: { salespersonId: id, status: "PENDING" } }),
      prisma.collection.aggregate({
        where: { salespersonId: id, collectedAt: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { amount: true },
      }),
    ]);
    res.json({
      todaySales: todayOrders._sum.grandTotal ?? 0,
      todayOrders: todayOrders._count,
      monthlySales: monthOrders._sum.grandTotal ?? 0,
      monthlyOrders: monthOrders._count,
      todayVisits: visitsToday,
      pendingFollowUps: followupsPending,
      monthlyCollections: collectionsMonth._sum.amount ?? 0,
    });
  })
);

export default router;
