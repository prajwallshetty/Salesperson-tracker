import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notifyAdmins } from "../services/notifications";
import { SAFE_USER_SELECT } from "../lib/selects";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { salespersonId, customerId, from, to } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.collectedAt = {};
      if (from) where.collectedAt.gte = new Date(from);
      if (to) where.collectedAt.lte = new Date(to);
    }
    const collections = await prisma.collection.findMany({
      where,
      include: { customer: true, order: true, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { collectedAt: "desc" },
    });
    res.json(collections);
  })
);

const createSchema = z.object({
  customerId: z.string(),
  orderId: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CHEQUE", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).default("CASH"),
  notes: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = createSchema.parse(req.body);
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : req.body.salespersonId;

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, tenantId } });
    if (!customer) return res.status(400).json({ error: "Customer not found" });
    if (data.orderId) {
      const order = await prisma.order.findFirst({ where: { id: data.orderId, tenantId } });
      if (!order) return res.status(400).json({ error: "Order not found" });
    }

    const collection = await prisma.collection.create({
      data: { ...data, tenantId, salespersonId },
      include: { customer: true, salesperson: { include: { user: { select: SAFE_USER_SELECT } } } },
    });

    if (data.orderId) {
      await prisma.order.update({
        where: { id: data.orderId },
        data: { amountCollected: { increment: data.amount } },
      });
    }

    await notifyAdmins(
      tenantId,
      "COLLECTION_RECEIVED",
      "Payment collected",
      `${collection.salesperson.user.name} collected ${data.amount} from ${collection.customer.name}`,
      { collectionId: collection.id, salespersonId }
    );

    res.status(201).json(collection);
  })
);

export default router;
