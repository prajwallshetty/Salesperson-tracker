import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { computeLine, computeDocumentTotals, resolvePricingForItems } from "../services/pricing";
import { docNumber } from "../utils/geo";
import { notifyAdmins } from "../services/notifications";
import { SAFE_USER_SELECT } from "../lib/selects";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { salespersonId, customerId, from, to } = req.query as Record<string, string>;
    const where: any = {};
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        salesperson: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: true } }, collections: true },
    });
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  })
);

const itemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  discountPercent: z.number().min(0).max(100).optional(),
});

const createSchema = z.object({
  customerId: z.string(),
  items: z.array(itemSchema).min(1),
  notes: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : req.body.salespersonId;

    const { resolve } = await resolvePricingForItems(data.items.map((i) => i.productId), data.customerId);
    const lines = data.items.map((i) => {
      const hit = resolve(i.productId);
      if (!hit) throw Object.assign(new Error(`Product ${i.productId} not found`), { status: 400 });
      return {
        ...computeLine({
          quantity: i.quantity,
          unitPrice: hit.resolved.unitPrice,
          discountPercent: i.discountPercent ?? hit.resolved.discountPercent,
          taxPercent: hit.resolved.taxPercent,
        }),
        productId: i.productId,
      };
    });
    const totals = computeDocumentTotals(lines);

    const order = await prisma.order.create({
      data: {
        number: docNumber("SO"),
        salespersonId,
        customerId: data.customerId,
        notes: data.notes,
        ...totals,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent,
            taxPercent: l.taxPercent,
            lineTotal: l.lineTotal,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        salesperson: { include: { user: { select: SAFE_USER_SELECT } } },
      },
    });

    await notifyAdmins(
      "ORDER_CREATED",
      "New sales order",
      `${order.salesperson.user.name} created order ${order.number} for ${order.customer.name}`,
      { orderId: order.id, salespersonId }
    );

    res.status(201).json(order);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(["CONFIRMED", "DELIVERED", "CANCELLED"]) }).parse(req.body);
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    res.json(order);
  })
);

export default router;
