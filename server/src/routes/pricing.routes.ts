import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { productId, territoryId, customerId, isActive, page = "1", pageSize = "20" } = req.query as Record<
      string,
      string
    >;
    const where: any = { tenantId };
    if (productId) where.productId = productId;
    if (territoryId) where.territoryId = territoryId;
    if (customerId) where.customerId = customerId;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const take = Math.min(parseInt(pageSize, 10) || 20, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.priceList.findMany({
        where,
        include: { product: true, territory: true, customer: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.priceList.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await prisma.priceList.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      include: { product: true, territory: true, customer: true },
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  })
);

const priceListSchema = z.object({
  productId: z.string(),
  territoryId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).default(0),
  taxPercent: z.number().min(0).max(100).default(0),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional().nullable(),
});

/**
 * A price list points at a product and optionally narrows to a territory or a customer - all
 * three ids come straight from the request body, so each has to be proven to belong to the
 * caller's tenant before it reaches Prisma. Otherwise a price rule can be created/updated
 * against another tenant's territory or customer just by supplying its id.
 * Returns an error message, or null when every supplied ref is valid.
 */
async function invalidTenantRef(tenantId: string, data: { productId?: string; territoryId?: string | null; customerId?: string | null }) {
  if (data.productId) {
    const product = await prisma.product.findFirst({ where: { id: data.productId, tenantId }, select: { id: true } });
    if (!product) return "Product not found";
  }
  if (data.territoryId) {
    const territory = await prisma.territory.findFirst({ where: { id: data.territoryId, tenantId }, select: { id: true } });
    if (!territory) return "Territory not found";
  }
  if (data.customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, tenantId }, select: { id: true } });
    if (!customer) return "Customer not found";
  }
  return null;
}

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = priceListSchema.parse(req.body);
    const refError = await invalidTenantRef(tenantId, data);
    if (refError) return res.status(400).json({ error: refError });

    const priceList = await prisma.priceList.create({
      data: {
        tenantId,
        productId: data.productId,
        territoryId: data.territoryId || null,
        customerId: data.customerId || null,
        price: data.price,
        discountPercent: data.discountPercent,
        taxPercent: data.taxPercent,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      },
      include: { product: true, territory: true, customer: true },
    });
    res.status(201).json(priceList);
  })
);

const updateSchema = priceListSchema.partial();

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = updateSchema.parse(req.body);
    const existing = await prisma.priceList.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const refError = await invalidTenantRef(tenantId, data);
    if (refError) return res.status(400).json({ error: refError });
    const priceList = await prisma.priceList.update({
      where: { id: req.params.id },
      data: {
        ...data,
        territoryId: data.territoryId === undefined ? undefined : data.territoryId || null,
        customerId: data.customerId === undefined ? undefined : data.customerId || null,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
        effectiveTo: data.effectiveTo === undefined ? undefined : data.effectiveTo ? new Date(data.effectiveTo) : null,
      },
      include: { product: true, territory: true, customer: true },
    });
    res.json(priceList);
  })
);

router.patch(
  "/:id/deactivate",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.priceList.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const priceList = await prisma.priceList.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json(priceList);
  })
);

export default router;
