import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Category is a standalone lookup table admins manage. Product.category stays the existing
// plain string field (unchanged create/edit behavior for products) - a Category row is matched
// to products by name equality, not a foreign key, so this table is purely additive.

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, isActive } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (isActive !== undefined) where.isActive = isActive === "true";
    const categories = await prisma.category.findMany({ where, orderBy: { name: "asc" } });

    // Attach a live product count per category (matched by name) in one grouped query instead
    // of one per category.
    const counts = await prisma.product.groupBy({
      by: ["category"],
      where: { category: { in: categories.map((c) => c.name) } },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.category, c._count]));
    res.json(categories.map((c) => ({ ...c, productCount: countMap.get(c.name) ?? 0 })));
  })
);

router.get(
  "/:id/products",
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ error: "Not found" });
    const products = await prisma.product.findMany({ where: { category: category.name }, orderBy: { name: "asc" } });
    res.json(products);
  })
);

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) return res.status(409).json({ error: "Category name already exists" });
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  })
);

router.patch(
  "/:id/status",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data: { isActive } });
    res.json(category);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ error: "Not found" });
    const productCount = await prisma.product.count({ where: { category: category.name } });
    if (productCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${productCount} product(s) still reference this category` });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
