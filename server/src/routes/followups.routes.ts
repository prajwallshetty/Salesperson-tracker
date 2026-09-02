import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, salespersonId } = req.query as Record<string, string>;
    const where: any = {};
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;

    if (status === "OVERDUE") {
      where.status = "PENDING";
      where.dueDate = { lt: new Date() };
    } else if (status) {
      where.status = status;
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        lead: true,
        customer: true,
        salesperson: { include: { user: { select: { name: true } } } },
      },
      orderBy: { dueDate: "asc" },
    });
    res.json(followUps);
  })
);

const followUpSchema = z.object({
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  dueDate: z.string(),
  notes: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = followUpSchema.parse(req.body);
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : req.body.salespersonId;
    const followUp = await prisma.followUp.create({
      data: { ...data, dueDate: new Date(data.dueDate), salespersonId },
    });
    res.status(201).json(followUp);
  })
);

router.patch(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    res.json(followUp);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = followUpSchema.partial().parse(req.body);
    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
    res.json(followUp);
  })
);

export default router;
