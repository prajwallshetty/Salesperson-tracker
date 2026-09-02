import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { haversineKm } from "../utils/geo";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, territoryId, salespersonId, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (req.auth!.role === "SALESPERSON") {
      where.salespersonId = req.auth!.salespersonId;
    } else if (salespersonId) {
      where.salespersonId = salespersonId;
    }
    if (territoryId) where.territoryId = territoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    const take = Math.min(parseInt(pageSize, 10) || 20, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { territory: true, salesperson: { include: { user: { select: { name: true } } } } },
        orderBy: { name: "asc" },
        take,
        skip,
      }),
      prisma.customer.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  "/nearby",
  asyncHandler(async (req, res) => {
    const { lat, lng, radiusKm = "10" } = req.query as Record<string, string>;
    if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });
    const where: any = { lat: { not: null }, lng: { not: null } };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const customers = await prisma.customer.findMany({ where });
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radius = parseFloat(radiusKm);
    const withDistance = customers
      .map((c) => ({ ...c, distanceKm: haversineKm(latN, lngN, c.lat!, c.lng!) }))
      .filter((c) => c.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    res.json(withDistance);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        territory: true,
        salesperson: { include: { user: { select: { name: true } } } },
        visits: { orderBy: { createdAt: "desc" }, take: 20 },
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
        collections: { orderBy: { collectedAt: "desc" }, take: 20 },
      },
    });
    if (!customer) return res.status(404).json({ error: "Not found" });
    res.json(customer);
  })
);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  territoryId: z.string().optional().nullable(),
  salespersonId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    if (req.auth!.role === "SALESPERSON") data.salespersonId = req.auth!.salespersonId;
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = customerSchema.partial().parse(req.body);
    if (req.auth!.role === "SALESPERSON") delete data.salespersonId;
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
    res.json(customer);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
