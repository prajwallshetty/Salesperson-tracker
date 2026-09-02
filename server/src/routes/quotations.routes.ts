import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { computeLine, computeDocumentTotals } from "../services/pricing";
import { docNumber } from "../utils/geo";
import { notifyAdmins } from "../services/notifications";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, salespersonId, customerId } = req.query as Record<string, string>;
    const where: any = {};
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
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
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

async function buildLines(items: z.infer<typeof itemSchema>[]) {
  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  return items.map((i) => {
    const product = productMap.get(i.productId);
    if (!product) throw Object.assign(new Error(`Product ${i.productId} not found`), { status: 400 });
    const computed = computeLine({
      quantity: i.quantity,
      unitPrice: product.price,
      discountPercent: i.discountPercent ?? product.discountPercent,
      taxPercent: product.taxPercent,
    });
    return { ...computed, productId: i.productId };
  });
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : req.body.salespersonId;
    const lines = await buildLines(data.items);
    const totals = computeDocumentTotals(lines);

    const quotation = await prisma.quotation.create({
      data: {
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
    const { status } = z.object({ status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]) }).parse(req.body);
    const quotation = await prisma.quotation.update({ where: { id: req.params.id }, data: { status } });
    res.json(quotation);
  })
);

router.post(
  "/:id/convert",
  asyncHandler(async (req, res) => {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: true, customer: true, salesperson: { include: { user: true } } },
    });
    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    if (quotation.convertedOrderId) return res.status(409).json({ error: "Already converted" });

    const order = await prisma.order.create({
      data: {
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
      "ORDER_CREATED",
      "New sales order",
      `${quotation.salesperson.user.name} created order ${order.number} for ${quotation.customer.name}`,
      { orderId: order.id, salespersonId: quotation.salespersonId }
    );

    res.status(201).json(order);
  })
);

export default router;
