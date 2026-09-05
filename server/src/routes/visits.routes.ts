import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { prisma } from "../lib/prisma";
import { resolveOwningSalespersonId } from "../lib/owningSalesperson";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notifyAdmins } from "../services/notifications";
import { SAFE_USER_SELECT } from "../lib/selects";
import { checkGeofence } from "../lib/geofence";

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
    const tenantId = req.auth!.tenantId;
    const {
      status,
      outcome,
      salespersonId,
      customerId,
      territoryId,
      from,
      dateFrom,
      to,
      dateTo,
      page,
      pageSize,
    } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    else if (salespersonId) where.salespersonId = salespersonId;
    if (status) where.status = status;
    if (outcome) where.outcome = outcome;
    if (customerId) where.customerId = customerId;
    // dateFrom/dateTo are aliases for from/to (either name works) - kept both so existing
    // callers using from/to keep working unchanged.
    const gte = dateFrom || from;
    const lte = dateTo || to;
    if (gte || lte) {
      where.createdAt = {};
      if (gte) where.createdAt.gte = new Date(gte);
      if (lte) where.createdAt.lte = new Date(lte);
    }
    if (territoryId) {
      // A visit doesn't carry its own territoryId - match through either the customer's or the
      // salesperson's territory (a visit can be "in" a territory via either relationship).
      where.OR = [{ customer: { territoryId } }, { salesperson: { territoryId } }];
    }

    const include = { customer: true, salesperson: { include: { user: { select: { name: true } } } } } as const;

    // Pagination is opt-in: passing page/pageSize returns the paginated {items,total,page,pageSize}
    // shape; omitting them preserves the original bare-array response (capped at 200) so existing
    // callers are unaffected.
    if (page !== undefined || pageSize !== undefined) {
      const take = Math.min(parseInt(pageSize, 10) || 20, 200);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
      const [items, total] = await Promise.all([
        prisma.visit.findMany({ where, include, orderBy: { createdAt: "desc" }, take, skip }),
        prisma.visit.count({ where }),
      ]);
      return res.json({ items, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: take });
    }

    const visits = await prisma.visit.findMany({
      where,
      include,
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
    const tenantId = req.auth!.tenantId;
    const data = createSchema.parse(req.body);
    const salespersonId = await resolveOwningSalespersonId(req.auth!, req.body.salespersonId);
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, tenantId } });
    if (!customer) return res.status(400).json({ error: "Customer not found" });
    const visit = await prisma.visit.create({
      data: {
        tenantId,
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
    const tenantId = req.auth!.tenantId;
    const { lat, lng, accuracy } = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().nonnegative().optional() }).parse(req.body);

    const existing = await prisma.visit.findFirst({ where: { id: req.params.id, tenantId }, include: { customer: true } });
    if (!existing) return res.status(404).json({ error: "Visit not found" });
    if (req.auth!.role === "SALESPERSON" && existing.salespersonId !== req.auth!.salespersonId) {
      return res.status(403).json({ error: "This visit does not belong to you" });
    }
    if (existing.status !== "PLANNED") {
      return res.status(409).json({
        error: `Cannot check in: visit is already ${existing.status.replace(/_/g, " ").toLowerCase()}`,
      });
    }

    // Geofence is a soft, audited check, not a hard block: customer coordinates are often
    // imprecisely geocoded and consumer GPS accuracy can be tens of meters, so rejecting a
    // check-in outright here would risk blocking a genuinely present salesperson. The distance
    // and validation outcome are stored either way (client sends checkInDistanceMeters/
    // checkInLocationValidated back to the salesperson as an honest "you appear to be away from
    // the customer" notice; never a client-supplied `checkedIn`/validated boolean going the other
    // direction - both are computed here, server-side, from the customer's real stored location).
    let checkInDistanceMeters: number | null = null;
    let checkInLocationValidated: boolean | null = null;
    if (existing.customer.lat != null && existing.customer.lng != null) {
      const geofence = checkGeofence(lat, lng, existing.customer.lat, existing.customer.lng);
      checkInDistanceMeters = Math.round(geofence.distanceMeters);
      checkInLocationValidated = geofence.withinRadius;
    }

    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: {
        status: "IN_PROGRESS",
        checkInAt: new Date(),
        checkInLat: lat,
        checkInLng: lng,
        checkInAccuracy: accuracy,
        checkInDistanceMeters,
        checkInLocationValidated,
      },
      include: { customer: true, salesperson: { include: { user: { select: SAFE_USER_SELECT } } } },
    });

    await prisma.salesperson.update({
      where: { id: visit.salespersonId },
      data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
    });

    await notifyAdmins(
      tenantId,
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
    const tenantId = req.auth!.tenantId;
    const { lat, lng, accuracy, notes, outcome, followUpDate, photoUrls } = z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().nonnegative().optional(),
        notes: z.string().optional(),
        outcome: z
          .enum(["ORDER_PLACED", "FOLLOW_UP_REQUIRED", "NOT_INTERESTED", "NO_RESPONSE", "PAYMENT_COLLECTED", "OTHER"])
          .optional(),
        followUpDate: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const existing = await prisma.visit.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Visit not found" });
    if (req.auth!.role === "SALESPERSON" && existing.salespersonId !== req.auth!.salespersonId) {
      return res.status(403).json({ error: "This visit does not belong to you" });
    }
    if (existing.status !== "IN_PROGRESS") {
      return res.status(409).json({
        error:
          existing.status === "COMPLETED"
            ? "This visit is already checked out"
            : `Cannot check out: visit has not been checked in (status is ${existing.status.replace(/_/g, " ").toLowerCase()})`,
      });
    }

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
        checkOutAccuracy: accuracy,
        durationMin,
        notes,
        outcome,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        photoUrls: photoUrls ?? undefined,
      },
      include: { customer: true, salesperson: { include: { user: { select: SAFE_USER_SELECT } } } },
    });

    if (followUpDate) {
      await prisma.followUp.create({
        data: {
          tenantId,
          salespersonId: visit.salespersonId,
          customerId: visit.customerId,
          dueDate: new Date(followUpDate),
          notes: `Follow-up from visit to ${visit.customer.name}`,
        },
      });
    }

    await notifyAdmins(
      tenantId,
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
    const tenantId = req.auth!.tenantId;
    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const visit = await prisma.visit.findFirst({ where });
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => `/uploads/${f.filename}`);
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
    const tenantId = req.auth!.tenantId;
    const data = z
      .object({
        notes: z.string().optional(),
        status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"]).optional(),
        followUpDate: z.string().optional(),
      })
      .parse(req.body);
    // A salesperson must reach IN_PROGRESS/COMPLETED only through the real GPS-validated
    // checkin/checkout flow above, never by directly PATCHing status - otherwise a visit could be
    // marked "completed" (with a customer notified, sales credit recorded, etc.) with no actual
    // check-in ever having happened. MISSED/CANCELLED stay salesperson-settable (a genuine
    // "the customer cancelled" housekeeping action, not a way to fake a completed visit); a full
    // status admin-only override remains available for corrections.
    if (req.auth!.role === "SALESPERSON" && data.status && !["MISSED", "CANCELLED"].includes(data.status)) {
      return res.status(403).json({ error: "Use check-in/check-out to update this visit's status." });
    }

    const where: any = { id: req.params.id, tenantId };
    if (req.auth!.role === "SALESPERSON") where.salespersonId = req.auth!.salespersonId;
    const existing = await prisma.visit.findFirst({ where });
    if (!existing) return res.status(404).json({ error: "Not found" });
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
