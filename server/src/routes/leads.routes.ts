import { Router } from "express";
import { z } from "zod";
import { LeadStatus } from "@prisma/client";
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
    const { status, salespersonId, search, limit } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (status) where.status = parseEnumQuery(status, LeadStatus, "status");
    if (search) where.name = { contains: search, mode: "insensitive" };
    const take = limit ? Math.min(parseInt(limit, 10) || 0, 200) || undefined : undefined;
    const leads = await prisma.lead.findMany({
      where,
      include: { salesperson: { include: { user: { select: { name: true } } } }, followUps: true },
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),
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
  salespersonId: z.string().min(1).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { salespersonId: requestedSalespersonId, ...data } = leadSchema.parse(req.body);
    // A Lead has a required salesperson relation. A SALESPERSON always owns their own lead;
    // an ADMIN has to name one. Missing it must fail here with a clear 400: previously an
    // absent id fell through to `findFirst({ where: { id: undefined, tenantId } })`, and
    // Prisma treats an `undefined` field as "don't filter on this at all" - so the ownership
    // check matched an arbitrary salesperson of the tenant, passed, and `lead.create` then
    // threw an unhandled PrismaClientValidationError that surfaced as a 500.
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : requestedSalespersonId;
    if (!salespersonId) return res.status(400).json({ error: "Select a salesperson to own this lead" });
    if (req.auth!.role === "ADMIN") {
      const owner = await prisma.salesperson.findFirst({ where: { id: salespersonId, tenantId } });
      if (!owner) return res.status(400).json({ error: "Salesperson not found" });
    }
    const lead = await prisma.lead.create({ data: { ...data, tenantId, salespersonId } });
    res.status(201).json(lead);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = leadSchema.partial().extend({ status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "CONVERTED", "LOST"]).optional() }).parse(req.body);
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const existing = await prisma.lead.findFirst({ where });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
    res.json(lead);
  })
);

router.post(
  "/:id/convert",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { address, lat, lng, territoryId } = z
      .object({ address: z.string().optional(), lat: z.number().optional(), lng: z.number().optional(), territoryId: z.string().optional() })
      .parse(req.body);
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const lead = await prisma.lead.findFirst({ where });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const customer = await prisma.customer.create({
      data: {
        tenantId,
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
