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
    const { status, salespersonId, search } = req.query as Record<string, string>;
    const where: any = {};
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };
    const leads = await prisma.lead.findMany({
      where,
      include: { salesperson: { include: { user: { select: { name: true } } } }, followUps: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(leads);
  })
);

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = leadSchema.parse(req.body);
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : req.body.salespersonId;
    const lead = await prisma.lead.create({ data: { ...data, salespersonId } });
    res.status(201).json(lead);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = leadSchema.partial().extend({ status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "CONVERTED", "LOST"]).optional() }).parse(req.body);
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
    res.json(lead);
  })
);

router.post(
  "/:id/convert",
  asyncHandler(async (req, res) => {
    const { address, lat, lng, territoryId } = z
      .object({ address: z.string().optional(), lat: z.number().optional(), lng: z.number().optional(), territoryId: z.string().optional() })
      .parse(req.body);
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const customer = await prisma.customer.create({
      data: {
        name: lead.company || lead.name,
        phone: lead.phone,
        email: lead.email,
        address,
        lat,
        lng,
        territoryId,
        salespersonId: lead.salespersonId,
        fromLeadId: lead.id,
      },
    });
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED" } });
    res.status(201).json(customer);
  })
);

export default router;
