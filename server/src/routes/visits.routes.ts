import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notifyAdmins } from "../services/notifications";
import { haversineKm } from "../utils/geo";

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `visit-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image uploads are allowed"));
    cb(null, true);
  },
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, salespersonId, customerId, from, to } = req.query as Record<string, string>;
    const where: any = {};
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const visits = await prisma.visit.findMany({
      where,
      include: { customer: true, salesperson: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(visits);
  })
);

const createSchema = z.object({
  customerId: z.string(),
  plannedAt: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const salespersonId = req.auth!.role === "SALESPERSON" ? req.auth!.salespersonId! : req.body.salespersonId;
    const visit = await prisma.visit.create({
      data: {
        salespersonId,
        customerId: data.customerId,
        plannedAt: data.plannedAt ? new Date(data.plannedAt) : undefined,
        status: "PLANNED",
      },
      include: { customer: true },
    });
    res.status(201).json(visit);
  })
);

router.post(
  "/:id/checkin",
  asyncHandler(async (req, res) => {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: { status: "IN_PROGRESS", checkInAt: new Date(), checkInLat: lat, checkInLng: lng },
      include: { customer: true, salesperson: { include: { user: true } } },
    });

    await prisma.salesperson.update({
      where: { id: visit.salespersonId },
      data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
    });

    await notifyAdmins(
      "CUSTOMER_REACHED",
      "Salesperson reached customer",
      `${visit.salesperson.user.name} checked in at ${visit.customer.name}`,
      { visitId: visit.id, salespersonId: visit.salespersonId, customerId: visit.customerId }
    );

    res.json(visit);
  })
);

router.post(
  "/:id/checkout",
  asyncHandler(async (req, res) => {
    const { lat, lng, notes, outcome, followUpDate, photoUrls } = z
      .object({
        lat: z.number(),
        lng: z.number(),
        notes: z.string().optional(),
        outcome: z
          .enum(["ORDER_PLACED", "FOLLOW_UP_REQUIRED", "NOT_INTERESTED", "NO_RESPONSE", "PAYMENT_COLLECTED", "OTHER"])
          .optional(),
        followUpDate: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const existing = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Visit not found" });

    const checkOutAt = new Date();
    const durationMin = existing.checkInAt
      ? Math.max(1, Math.round((checkOutAt.getTime() - existing.checkInAt.getTime()) / 60000))
      : null;

    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        checkOutAt,
        checkOutLat: lat,
        checkOutLng: lng,
        durationMin,
        notes,
        outcome,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        photoUrls: photoUrls ?? undefined,
      },
      include: { customer: true, salesperson: { include: { user: true } } },
    });

    if (followUpDate) {
      await prisma.followUp.create({
        data: {
          salespersonId: visit.salespersonId,
          customerId: visit.customerId,
          dueDate: new Date(followUpDate),
          notes: `Follow-up from visit to ${visit.customer.name}`,
        },
      });
    }

    await notifyAdmins(
      "VISIT_COMPLETED",
      "Customer visit completed",
      `${visit.salesperson.user.name} completed a visit to ${visit.customer.name}`,
      { visitId: visit.id, salespersonId: visit.salespersonId }
    );

    res.json(visit);
  })
);

router.post(
  "/:id/photos",
  upload.array("photos", 5),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => `/uploads/${f.filename}`);
    const visit = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    const updated = await prisma.visit.update({
      where: { id: req.params.id },
      data: { photoUrls: [...visit.photoUrls, ...urls] },
    });
    res.json(updated);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        notes: z.string().optional(),
        status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"]).optional(),
        followUpDate: z.string().optional(),
      })
      .parse(req.body);
    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: {
        notes: data.notes,
        status: data.status,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      },
    });
    res.json(visit);
  })
);

export default router;
