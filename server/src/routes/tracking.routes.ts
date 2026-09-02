import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { haversineKm } from "../utils/geo";
import { startOfDay, endOfDay } from "../utils/dates";
import { notifyAdmins } from "../services/notifications";
import { getIO } from "../sockets/io";

const router = Router();
router.use(requireAuth);

router.get(
  "/live",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const salespersons = await prisma.salesperson.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        territory: true,
      },
    });

    const now = new Date();
    const enriched = await Promise.all(
      salespersons.map(async (sp) => {
        const [todayVisits, currentVisit, todayOrders, todayCollections] = await Promise.all([
          prisma.visit.count({ where: { salespersonId: sp.id, createdAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
          prisma.visit.findFirst({
            where: { salespersonId: sp.id, status: "IN_PROGRESS" },
            include: { customer: true },
            orderBy: { checkInAt: "desc" },
          }),
          prisma.order.aggregate({
            where: { salespersonId: sp.id, createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
            _sum: { grandTotal: true },
          }),
          prisma.collection.aggregate({
            where: { salespersonId: sp.id, collectedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
            _sum: { amount: true },
          }),
        ]);

        return {
          id: sp.id,
          name: sp.user.name,
          avatarUrl: sp.user.avatarUrl,
          territory: sp.territory?.name ?? null,
          isOnline: sp.isOnline,
          fieldWorkStatus: sp.fieldWorkStatus,
          fieldWorkStartAt: sp.fieldWorkStartAt,
          lastLat: sp.lastLat,
          lastLng: sp.lastLng,
          lastSpeed: sp.lastSpeed,
          lastSeenAt: sp.lastSeenAt,
          todayDistanceKm: sp.todayDistanceKm,
          todayVisits,
          todaySales: todayOrders._sum.grandTotal ?? 0,
          todayCollections: todayCollections._sum.amount ?? 0,
          currentCustomer: currentVisit?.customer.name ?? null,
          currentVisitStatus: currentVisit?.status ?? "NONE",
        };
      })
    );

    res.json(enriched);
  })
);

router.get(
  "/:salespersonId/route",
  asyncHandler(async (req, res) => {
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.salespersonId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const date = new Date(dateStr);
    const from = startOfDay(date);
    const to = endOfDay(date);

    const [points, visits] = await Promise.all([
      prisma.locationPing.findMany({
        where: { salespersonId: req.params.salespersonId, recordedAt: { gte: from, lte: to } },
        orderBy: { recordedAt: "asc" },
      }),
      prisma.visit.findMany({
        where: { salespersonId: req.params.salespersonId, createdAt: { gte: from, lte: to } },
        include: { customer: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    let distanceKm = 0;
    for (let i = 1; i < points.length; i++) {
      distanceKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    }

    const start = points[0] ?? null;
    const end = points[points.length - 1] ?? null;
    const durationMin = start && end ? Math.round((end.recordedAt.getTime() - start.recordedAt.getTime()) / 60000) : 0;

    res.json({
      date: dateStr,
      points,
      stops: visits,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin,
      start,
      end,
    });
  })
);

router.post(
  "/ping",
  requireRole("SALESPERSON"),
  asyncHandler(async (req, res) => {
    const { lat, lng, speed, accuracy, heading, recordedAt } = z
      .object({
        lat: z.number(),
        lng: z.number(),
        speed: z.number().optional(),
        accuracy: z.number().optional(),
        heading: z.number().optional(),
        recordedAt: z.string().optional(),
      })
      .parse(req.body);

    const salespersonId = req.auth!.salespersonId!;
    const result = await recordLocationPing(salespersonId, { lat, lng, speed, accuracy, heading, recordedAt });
    res.status(201).json(result);
  })
);

router.post(
  "/field-work/start",
  requireRole("SALESPERSON"),
  asyncHandler(async (req, res) => {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const salespersonId = req.auth!.salespersonId!;
    const now = new Date();

    const sp = await prisma.salesperson.update({
      where: { id: salespersonId },
      data: {
        fieldWorkStatus: "ACTIVE",
        fieldWorkStartAt: now,
        fieldWorkEndAt: null,
        isOnline: true,
        todayDistanceKm: 0,
        lastLat: lat,
        lastLng: lng,
        lastSeenAt: now,
      },
      include: { user: true },
    });

    await prisma.attendance.upsert({
      where: { salespersonId_date: { salespersonId, date: startOfDay(now) } },
      create: { salespersonId, date: startOfDay(now), checkInAt: now, checkInLat: lat, checkInLng: lng },
      update: { checkInAt: now, checkInLat: lat, checkInLng: lng },
    });

    await notifyAdmins(
      "FIELD_WORK_STARTED",
      "Field work started",
      `${sp.user.name} started field work`,
      { salespersonId }
    );

    try {
      getIO().to("admins").emit("salesperson:status", { salespersonId, isOnline: true, fieldWorkStatus: "ACTIVE" });
    } catch {
      /* socket not ready */
    }

    res.json(sp);
  })
);

router.post(
  "/field-work/end",
  requireRole("SALESPERSON"),
  asyncHandler(async (req, res) => {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const salespersonId = req.auth!.salespersonId!;
    const now = new Date();

    const sp = await prisma.salesperson.update({
      where: { id: salespersonId },
      data: {
        fieldWorkStatus: "ENDED",
        fieldWorkEndAt: now,
        isOnline: false,
        lastLat: lat,
        lastLng: lng,
        lastSeenAt: now,
      },
      include: { user: true },
    });

    const attendance = await prisma.attendance.findUnique({
      where: { salespersonId_date: { salespersonId, date: startOfDay(now) } },
    });
    const durationMin = attendance?.checkInAt
      ? Math.round((now.getTime() - attendance.checkInAt.getTime()) / 60000)
      : 0;

    await prisma.attendance.upsert({
      where: { salespersonId_date: { salespersonId, date: startOfDay(now) } },
      create: {
        salespersonId,
        date: startOfDay(now),
        checkOutAt: now,
        checkOutLat: lat,
        checkOutLng: lng,
        totalDistanceKm: sp.todayDistanceKm,
        totalDurationMin: durationMin,
      },
      update: { checkOutAt: now, checkOutLat: lat, checkOutLng: lng, totalDistanceKm: sp.todayDistanceKm, totalDurationMin: durationMin },
    });

    await notifyAdmins("FIELD_WORK_ENDED", "Field work ended", `${sp.user.name} ended field work`, { salespersonId });

    try {
      getIO().to("admins").emit("salesperson:status", { salespersonId, isOnline: false, fieldWorkStatus: "ENDED" });
    } catch {
      /* socket not ready */
    }

    res.json(sp);
  })
);

interface PingInput {
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
  heading?: number;
  recordedAt?: string;
}

export async function recordLocationPing(salespersonId: string, input: PingInput) {
  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();

  const last = await prisma.locationPing.findFirst({
    where: { salespersonId },
    orderBy: { recordedAt: "desc" },
  });

  // Skip near-duplicate points (< 5m and < 3s apart) to avoid noisy buffered bursts.
  if (last) {
    const dKm = haversineKm(last.lat, last.lng, input.lat, input.lng);
    const dtSec = Math.abs(recordedAt.getTime() - last.recordedAt.getTime()) / 1000;
    if (dKm < 0.005 && dtSec < 3) {
      return { skipped: true };
    }
  }

  const ping = await prisma.locationPing.create({
    data: {
      salespersonId,
      lat: input.lat,
      lng: input.lng,
      speed: input.speed,
      accuracy: input.accuracy,
      heading: input.heading,
      recordedAt,
    },
  });

  const incrementKm = last ? haversineKm(last.lat, last.lng, input.lat, input.lng) : 0;

  const sp = await prisma.salesperson.update({
    where: { id: salespersonId },
    data: {
      lastLat: input.lat,
      lastLng: input.lng,
      lastSpeed: input.speed,
      lastSeenAt: recordedAt,
      isOnline: true,
      todayDistanceKm: { increment: incrementKm },
    },
    include: { user: { select: { name: true } } },
  });

  try {
    getIO()
      .to("admins")
      .emit("location:update", {
        salespersonId,
        name: sp.user.name,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
        recordedAt: recordedAt.toISOString(),
        todayDistanceKm: sp.todayDistanceKm,
        isOnline: true,
      });
  } catch {
    /* socket not ready */
  }

  return { ping, todayDistanceKm: sp.todayDistanceKm };
}

export default router;
