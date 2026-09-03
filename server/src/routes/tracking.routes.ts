import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { haversineKm } from "../utils/geo";
import { startOfDay, endOfDay } from "../utils/dates";
import { notifyAdmins } from "../services/notifications";
import { getIO } from "../sockets/io";
import { SAFE_USER_SELECT } from "../lib/selects";

const router = Router();
router.use(requireAuth);

// A salesperson using the REST ping fallback (no live socket) never has anything flip
// `isOnline` back to false if their device goes dark (killed app, dead battery, lost signal)
// without an explicit field-work/end call - the socket path has a 20s disconnect grace period,
// but nothing analogous exists for REST-only clients. Bug fix: treat a salesperson as online only
// if the raw flag is set AND their last ping is recent: derived at read time here, so it never
// touches the stored isOnline value or the write path's behavior.
const STALE_ONLINE_MS = 3 * 60 * 1000;
function isEffectivelyOnline(sp: { isOnline: boolean; lastSeenAt: Date | null }): boolean {
  if (!sp.isOnline || !sp.lastSeenAt) return false;
  return Date.now() - sp.lastSeenAt.getTime() < STALE_ONLINE_MS;
}

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
    const ids = salespersons.map((sp) => sp.id);
    const todayRange = { gte: startOfDay(now), lte: endOfDay(now) };

    // Batch the per-salesperson stats into one query each (grouped by salespersonId) instead of
    // firing 4 queries per salesperson - this endpoint is polled continuously by the live map.
    const [visitCounts, inProgressVisits, orderSums, collectionSums, latestPings] = await Promise.all([
      prisma.visit.groupBy({
        by: ["salespersonId"],
        where: { salespersonId: { in: ids }, createdAt: todayRange },
        _count: true,
      }),
      prisma.visit.findMany({
        where: { salespersonId: { in: ids }, status: "IN_PROGRESS" },
        include: { customer: true },
        orderBy: { checkInAt: "desc" },
      }),
      prisma.order.groupBy({
        by: ["salespersonId"],
        where: { salespersonId: { in: ids }, createdAt: todayRange },
        _sum: { grandTotal: true },
      }),
      prisma.collection.groupBy({
        by: ["salespersonId"],
        where: { salespersonId: { in: ids }, collectedAt: todayRange },
        _sum: { amount: true },
      }),
      // Salesperson.lastLat/lastLng/lastSpeed is the "current location" cache, but it has no
      // lastHeading/lastAccuracy columns - that data only exists per-ping in LocationPing
      // history. Reading the single freshest ping per salesperson (via DISTINCT ON, backed by
      // the existing (salespersonId, recordedAt) index) surfaces heading/accuracy for the live
      // map without writing anything back or altering the history/cache separation.
      ids.length
        ? prisma.$queryRaw<Array<{ salespersonId: string; heading: number | null; accuracy: number | null }>>`
            SELECT DISTINCT ON ("salespersonId") "salespersonId", "heading", "accuracy"
            FROM "LocationPing"
            WHERE "salespersonId" = ANY(${ids})
            ORDER BY "salespersonId", "recordedAt" DESC
          `
        : Promise.resolve([]),
    ]);

    const todayVisitsMap = new Map(visitCounts.map((v) => [v.salespersonId, v._count]));
    const todaySalesMap = new Map(orderSums.map((o) => [o.salespersonId, o._sum.grandTotal ?? 0]));
    const todayCollectionsMap = new Map(collectionSums.map((c) => [c.salespersonId, c._sum.amount ?? 0]));
    const latestPingMap = new Map(latestPings.map((p) => [p.salespersonId, p]));
    // inProgressVisits is ordered by checkInAt desc, so the first occurrence per salesperson is
    // their most recent in-progress visit (matches the previous per-row findFirst semantics).
    const currentVisitMap = new Map<string, (typeof inProgressVisits)[number]>();
    for (const v of inProgressVisits) {
      if (!currentVisitMap.has(v.salespersonId)) currentVisitMap.set(v.salespersonId, v);
    }

    const enriched = salespersons.map((sp) => {
      const currentVisit = currentVisitMap.get(sp.id);
      const latestPing = latestPingMap.get(sp.id);
      return {
        id: sp.id,
        name: sp.user.name,
        avatarUrl: sp.user.avatarUrl,
        territory: sp.territory?.name ?? null,
        isOnline: isEffectivelyOnline(sp),
        fieldWorkStatus: sp.fieldWorkStatus,
        fieldWorkStartAt: sp.fieldWorkStartAt,
        lastLat: sp.lastLat,
        lastLng: sp.lastLng,
        lastSpeed: sp.lastSpeed,
        lastHeading: latestPing?.heading ?? null,
        lastAccuracy: latestPing?.accuracy ?? null,
        lastSeenAt: sp.lastSeenAt,
        todayDistanceKm: sp.todayDistanceKm,
        todayVisits: todayVisitsMap.get(sp.id) ?? 0,
        todaySales: todaySalesMap.get(sp.id) ?? 0,
        todayCollections: todayCollectionsMap.get(sp.id) ?? 0,
        currentCustomerId: currentVisit?.customerId ?? null,
        currentCustomer: currentVisit?.customer.name ?? null,
        currentVisitId: currentVisit?.id ?? null,
        currentVisitStatus: currentVisit?.status ?? "NONE",
      };
    });

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
      include: { user: { select: SAFE_USER_SELECT } },
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
      include: { user: { select: SAFE_USER_SELECT } },
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

  const incrementKm = last ? haversineKm(last.lat, last.lng, input.lat, input.lng) : 0;

  // The ping insert and the salesperson row update are independent writes (neither depends on
  // the other's result), so run them concurrently instead of serially to cut round-trip latency
  // in half on every GPS tick.
  const [ping, sp] = await Promise.all([
    prisma.locationPing.create({
      data: {
        salespersonId,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        accuracy: input.accuracy,
        heading: input.heading,
        recordedAt,
      },
    }),
    prisma.salesperson.update({
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
    }),
  ]);

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
