import { Router } from "express";
import { z } from "zod";
import { FollowUpStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { parseEnumQuery } from "../utils/enumQuery";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { status, salespersonId } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;

    if (status === "OVERDUE") {
      where.status = "PENDING";
      where.dueDate = { lt: new Date() };
    } else if (status) {
      where.status = parseEnumQuery(status, FollowUpStatus, "status");
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
  salespersonId: z.string().min(1).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { salespersonId: requestedSalespersonId, ...data } = followUpSchema.parse(req.body);
    // Must be resolved and present before the ownership lookup: `findFirst({ where: { id:
    // undefined } })` is not "no match" in Prisma, it's "no filter", so an omitted id used to
    // match an unrelated salesperson and pass the check.
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : requestedSalespersonId;
    if (!salespersonId) return res.status(400).json({ error: "Select a salesperson for this follow-up" });
    if (req.auth!.role === "ADMIN") {
      const owner = await prisma.salesperson.findFirst({ where: { id: salespersonId, tenantId } });
      if (!owner) return res.status(400).json({ error: "Salesperson not found" });
    }
    // The lead/customer a follow-up points at arrives from the request body, so each must be
    // confirmed to belong to this tenant - otherwise a follow-up can be created against
    // another tenant's record simply by supplying its id.
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: data.customerId, tenantId }, select: { id: true } });
      if (!customer) return res.status(400).json({ error: "Customer not found" });
    }
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: data.leadId, tenantId }, select: { id: true } });
      if (!lead) return res.status(400).json({ error: "Lead not found" });
    }
    const followUp = await prisma.followUp.create({
      data: { ...data, tenantId, dueDate: new Date(data.dueDate), salespersonId },
    });
    res.status(201).json(followUp);
  })
);

router.patch(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const existing = await prisma.followUp.findFirst({ where });
    if (!existing) return res.status(404).json({ error: "Not found" });
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
    const tenantId = req.auth!.tenantId;
    const data = followUpSchema.partial().parse(req.body);
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const existing = await prisma.followUp.findFirst({ where });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
    res.json(followUp);
  })
);

export default router;
