import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { resolveOwningSalespersonId } from "../lib/owningSalesperson";
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
    const tenantId = req.auth!.tenantId;
    const { status, salespersonId, customerId } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const quotations = await prisma.quotation.findMany({
      where,
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(quotations);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const quotation = await prisma.quotation.findFirst({
      where,
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!quotation) return res.status(404).json({ error: "Not found" });
    res.json(quotation);
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

async function buildLines(tenantId: string, items: z.infer<typeof itemSchema>[], customerId: string) {
  const { resolve } = await resolvePricingForItems(tenantId, items.map((i) => i.productId), customerId);
  return items.map((i) => {
    const hit = resolve(i.productId);
    if (!hit) throw Object.assign(new Error(`Product ${i.productId} not found`), { status: 400 });
    const computed = computeLine({
      quantity: i.quantity,
      unitPrice: hit.resolved.unitPrice,
      discountPercent: i.discountPercent ?? hit.resolved.discountPercent,
      taxPercent: hit.resolved.taxPercent,
    });
    return { ...computed, productId: i.productId };
  });
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = createSchema.parse(req.body);
    const salespersonId = await resolveOwningSalespersonId(req.auth!, req.body.salespersonId);
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, tenantId } });
    if (!customer) return res.status(400).json({ error: "Customer not found" });
    const lines = await buildLines(tenantId, data.items, data.customerId);
    const totals = computeDocumentTotals(lines);

    const quotation = await prisma.quotation.create({
      data: {
        tenantId,
        number: docNumber("QT"),
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
      include: { items: { include: { product: true } }, customer: true },
    });
    res.status(201).json(quotation);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { status } = z.object({ status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]) }).parse(req.body);
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const existing = await prisma.quotation.findFirst({ where });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const quotation = await prisma.quotation.update({ where: { id: req.params.id }, data: { status } });
    res.json(quotation);
  })
);

router.post(
  "/:id/convert",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const quotation = await prisma.quotation.findFirst({
      where,
      include: { items: true, customer: true, salesperson: { include: { user: { select: SAFE_USER_SELECT } } } },
    });
    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    if (quotation.convertedOrderId) return res.status(409).json({ error: "Already converted" });

    const order = await prisma.order.create({
      data: {
        tenantId,
        number: docNumber("SO"),
        salespersonId: quotation.salespersonId,
        customerId: quotation.customerId,
        subtotal: quotation.subtotal,
        taxTotal: quotation.taxTotal,
        discountTotal: quotation.discountTotal,
        grandTotal: quotation.grandTotal,
        notes: quotation.notes,
        items: {
          create: quotation.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            taxPercent: i.taxPercent,
            lineTotal: i.lineTotal,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "CONVERTED", convertedOrderId: order.id },
    });

    await notifyAdmins(
      tenantId,
      "ORDER_CREATED",
      "New sales order",
      `${quotation.salesperson.user.name} created order ${order.number} for ${quotation.customer.name}`,
      { orderId: order.id, salespersonId: quotation.salespersonId }
    );

    res.status(201).json(order);
  })
);

export default router;
