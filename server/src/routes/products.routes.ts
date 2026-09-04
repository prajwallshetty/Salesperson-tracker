import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image uploads are allowed"));
    cb(null, true);
  },
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { search, category, isActive, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }];
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === "true";
    const take = Math.min(parseInt(pageSize, 10) || 20, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
      prisma.product.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const rows = await prisma.product.findMany({
      where: { tenantId: req.auth!.tenantId },
      distinct: ["category"],
      select: { category: true },
    });
    res.json(rows.map((r) => r.category));
  })
);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  price: z.number().nonnegative(),
  taxPercent: z.number().min(0).max(100).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { tenantId_sku: { tenantId, sku: data.sku } } });
    if (existing) return res.status(409).json({ error: "SKU already exists" });
    const product = await prisma.product.create({ data: { ...data, tenantId } });
    res.status(201).json(product);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = productSchema.partial().parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  })
);

router.patch(
  "/:id/status",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { isActive } });
    res.json(product);
  })
);

router.post(
  "/:id/image",
  requireRole("ADMIN"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const imageUrl = `/uploads/${req.file.filename}`;
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { imageUrl } });
    res.json(product);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
