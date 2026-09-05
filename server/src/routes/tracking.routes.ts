import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireActiveSubscription, requireFeature } from "../lib/entitlements";
import { haversineKm } from "../utils/geo";
import { startOfDay, endOfDay } from "../utils/dates";
import { notifyAdmins } from "../services/notifications";
import { getIO } from "../sockets/io";
import { SAFE_USER_SELECT } from "../lib/selects";
import { isValidCoordinate, isPlausibleTimestamp, isImplausibleJump, isRateLimited } from "../lib/gpsValidation";

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
  requireActiveSubscription(),
  requireFeature("GPS_TRACKING"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const salespersons = await prisma.salesperson.findMany({
      where: { tenantId, status: "ACTIVE" },
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
    // `ids` already only contains this tenant's salespersons, so these grouped queries are
    // transitively tenant-scoped without needing their own tenantId filter.
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

// A salesperson's past field-work shifts, for the route-history "Field Work Session" filter -
// each row is a real shift boundary (start/end lat/lng/time), not a calendar-day guess.
router.get(
  "/:salespersonId/field-work-sessions",
  requireActiveSubscription(),
  requireFeature("ROUTE_ANALYTICS"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.salespersonId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const salesperson = await prisma.salesperson.findFirst({ where: { id: req.params.salespersonId, tenantId } });
    if (!salesperson) return res.status(404).json({ error: "Not found" });

    const sessions = await prisma.fieldWorkSession.findMany({
      where: { tenantId, salespersonId: req.params.salespersonId },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    res.json(sessions);
  })
);

router.get(
  "/:salespersonId/route",
  requireActiveSubscription(),
  requireFeature("ROUTE_ANALYTICS"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    if (req.auth!.role === "SALESPERSON" && req.auth!.salespersonId !== req.params.salespersonId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const salesperson = await prisma.salesperson.findFirst({ where: { id: req.params.salespersonId, tenantId } });
    if (!salesperson) return res.status(404).json({ error: "Not found" });

    const fieldWorkSessionId = req.query.fieldWorkSessionId as string | undefined;
    let from: Date, to: Date, dateStr: string, session = null as Awaited<ReturnType<typeof prisma.fieldWorkSession.findFirst>>;

    if (fieldWorkSessionId) {
      session = await prisma.fieldWorkSession.findFirst({ where: { id: fieldWorkSessionId, tenantId, salespersonId: req.params.salespersonId } });
      if (!session) return res.status(404).json({ error: "Field work session not found" });
      from = session.startedAt;
      to = session.endedAt ?? new Date();
      dateStr = from.toISOString().slice(0, 10);
    } else {
      dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const date = new Date(dateStr);
      from = startOfDay(date);
      to = endOfDay(date);
    }

    const pointWhere: any = fieldWorkSessionId
      ? { tenantId, salespersonId: req.params.salespersonId, fieldWorkSessionId }
      : { tenantId, salespersonId: req.params.salespersonId, recordedAt: { gte: from, lte: to } };

    const [rawPoints, visits] = await Promise.all([
      prisma.locationPing.findMany({
        where: pointWhere,
        orderBy: { recordedAt: "asc" },
      }),
      prisma.visit.findMany({
        where: { tenantId, salespersonId: req.params.salespersonId, createdAt: { gte: from, lte: to } },
        include: { customer: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Route reconstruction: sorted (query already orders by recordedAt), then drop points flagged
    // as an implausible jump and exact-duplicate (same coordinate + timestamp, which can arrive
    // from a retried submission) before rendering - the stored history itself is never altered,
    // only what this response returns for the map.
    const seen = new Set<string>();
    const points = rawPoints.filter((p) => {
      if (p.flaggedSuspicious) return false;
      const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)},${p.recordedAt.getTime()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const excludedCount = rawPoints.length - points.length;

    let distanceKm = 0;
    for (let i = 1; i < points.length; i++) {
      distanceKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    }

    const start = points[0] ?? null;
    const end = points[points.length - 1] ?? null;
    const durationMin = start && end ? Math.round((end.recordedAt.getTime() - start.recordedAt.getTime()) / 60000) : 0;

    res.json({
      date: dateStr,
      fieldWorkSession: session,
      points,
      excludedPointCount: excludedCount,
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
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        speed: z.number().nonnegative().optional(),
        accuracy: z.number().nonnegative().optional(),
        heading: z.number().min(0).max(360).optional(),
        recordedAt: z.string().optional(),
        // fieldWorkSessionId is intentionally NOT accepted here - the backend always resolves the
        // caller's own currently-ACTIVE session itself (see recordLocationPing below). Accepting
        // a client-supplied session id would let a ping be misattributed to a stale/foreign
        // session; zod silently strips this key if a client sends it anyway.
      })
      .parse(req.body);

    const salespersonId = req.auth!.salespersonId!;
    const result = await recordLocationPing(req.auth!.tenantId, salespersonId, { lat, lng, speed, accuracy, heading, recordedAt });
    res.status(201).json(result);
  })
);

router.post(
  "/field-work/start",
  requireRole("SALESPERSON"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { lat, lng } = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(req.body);
    const salespersonId = req.auth!.salespersonId!;
    const now = new Date();

    // Duplicate-session protection: a double-click, slow-network retry, page refresh, or a second
    // open browser tab must never create a second ACTIVE session or reset today's distance -
    // return the session that's already running instead.
    const existingActive = await prisma.fieldWorkSession.findFirst({ where: { salespersonId, status: "ACTIVE" } });
    if (existingActive) {
      const sp = await prisma.salesperson.findUnique({ where: { id: salespersonId }, include: { user: { select: SAFE_USER_SELECT } } });
      return res.json({ ...sp, fieldWorkSession: existingActive });
    }

    const [session, sp] = await prisma.$transaction([
      prisma.fieldWorkSession.create({
        data: { tenantId, salespersonId, status: "ACTIVE", startedAt: now, startLatitude: lat, startLongitude: lng, lastLocationAt: now },
      }),
      prisma.salesperson.update({
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
      }),
    ]);

    await prisma.attendance.upsert({
      where: { salespersonId_date: { salespersonId, date: startOfDay(now) } },
      create: { tenantId, salespersonId, date: startOfDay(now), checkInAt: now, checkInLat: lat, checkInLng: lng },
      update: { checkInAt: now, checkInLat: lat, checkInLng: lng },
    });

    await notifyAdmins(
      tenantId,
      "FIELD_WORK_STARTED",
      "Field work started",
      `${sp.user.name} started field work`,
      { salespersonId }
    );

    try {
      getIO().to(`admins:${tenantId}`).emit("salesperson:status", { salespersonId, isOnline: true, fieldWorkStatus: "ACTIVE" });
    } catch {
      /* socket not ready */
    }

    res.json({ ...sp, fieldWorkSession: session });
  })
);

router.post(
  "/field-work/end",
  requireRole("SALESPERSON"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { lat, lng } = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(req.body);
    const salespersonId = req.auth!.salespersonId!;
    const now = new Date();

    const activeSession = await prisma.fieldWorkSession.findFirst({ where: { salespersonId, status: "ACTIVE" } });
    if (!activeSession) {
      // A network retry after a response that actually succeeded server-side must not error out
      // just because the session is (correctly) already ended - return the same success shape
      // idempotently rather than leaving the frontend stuck showing "unable to end field work".
      const lastSession = await prisma.fieldWorkSession.findFirst({ where: { salespersonId }, orderBy: { startedAt: "desc" } });
      if (lastSession?.status === "ENDED") {
        const sp = await prisma.salesperson.findUnique({ where: { id: salespersonId }, include: { user: { select: SAFE_USER_SELECT } } });
        return res.json({ ...sp, fieldWorkSession: lastSession, alreadyEnded: true });
      }
      return res.status(409).json({ error: "No active field work session to end." });
    }

    const [session, sp] = await prisma.$transaction([
      prisma.fieldWorkSession.update({
        where: { id: activeSession.id },
        data: { status: "ENDED", endedAt: now, endLatitude: lat, endLongitude: lng, lastLocationAt: now },
      }),
      prisma.salesperson.update({
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
      }),
    ]);

    const attendance = await prisma.attendance.findUnique({
      where: { salespersonId_date: { salespersonId, date: startOfDay(now) } },
    });
    const durationMin = attendance?.checkInAt
      ? Math.round((now.getTime() - attendance.checkInAt.getTime()) / 60000)
      : 0;

    await prisma.attendance.upsert({
      where: { salespersonId_date: { salespersonId, date: startOfDay(now) } },
      create: {
        tenantId,
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

    await notifyAdmins(tenantId, "FIELD_WORK_ENDED", "Field work ended", `${sp.user.name} ended field work`, { salespersonId });

    try {
      getIO().to(`admins:${tenantId}`).emit("salesperson:status", { salespersonId, isOnline: false, fieldWorkStatus: "ENDED" });
    } catch {
      /* socket not ready */
    }

    res.json({ ...sp, fieldWorkSession: session });
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

export async function recordLocationPing(tenantId: string, salespersonId: string, input: PingInput) {
  // Applies to BOTH ingestion paths (REST /tracking/ping and the Socket.IO "location:update"
  // event both call this one function) - see lib/gpsValidation.ts's own comment for why this
  // can't just be an Express-only rate-limit middleware.
  if (isRateLimited(salespersonId)) {
    return { stored: false, reason: "rate_limited" as const };
  }

  if (!isValidCoordinate(input.lat, input.lng)) {
    return { stored: false, reason: "invalid_coordinates" as const };
  }

  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
  if (!isPlausibleTimestamp(recordedAt)) {
    return { stored: false, reason: "invalid_timestamp" as const };
  }

  const [last, activeSession] = await Promise.all([
    prisma.locationPing.findFirst({
      where: { salespersonId },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.fieldWorkSession.findFirst({
      where: { salespersonId, status: "ACTIVE" },
    }),
  ]);

  // Skip near-duplicate points (< 5m and < 3s apart) to avoid noisy buffered bursts.
  if (last) {
    const dKm = haversineKm(last.lat, last.lng, input.lat, input.lng);
    const dtSec = Math.abs(recordedAt.getTime() - last.recordedAt.getTime()) / 1000;
    if (dKm < 0.005 && dtSec < 3) {
      return { stored: false, reason: "duplicate" as const };
    }
  }

  const distanceKm = last ? haversineKm(last.lat, last.lng, input.lat, input.lng) : 0;
  const dtSecForJumpCheck = last ? Math.abs(recordedAt.getTime() - last.recordedAt.getTime()) / 1000 : 0;
  // A physically implausible jump from the previous point (see lib/gpsValidation.ts) - the raw
  // reading is still stored (never silently discarded), but it doesn't count toward distance and
  // doesn't move the salesperson's "current location" cache, so one bad fix can't corrupt a
  // shift's total or make the live map show a spurious teleport.
  const suspicious = last ? isImplausibleJump(distanceKm, dtSecForJumpCheck) : false;
  const incrementKm = suspicious ? 0 : distanceKm;

  // The ping insert and the salesperson row update are independent writes (neither depends on
  // the other's result), so run them concurrently instead of serially to cut round-trip latency
  // in half on every GPS tick.
  const [ping, sp] = await Promise.all([
    prisma.locationPing.create({
      data: {
        tenantId,
        salespersonId,
        fieldWorkSessionId: activeSession?.id,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        accuracy: input.accuracy,
        heading: input.heading,
        flaggedSuspicious: suspicious,
        recordedAt,
      },
    }),
    suspicious
      ? prisma.salesperson.update({
          where: { id: salespersonId },
          data: { lastSeenAt: recordedAt, isOnline: true },
          include: { user: { select: { name: true } } },
        })
      : prisma.salesperson.update({
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
    activeSession && !suspicious
      ? prisma.fieldWorkSession.update({
          where: { id: activeSession.id },
          data: { lastLocationAt: recordedAt, totalDistanceMeters: { increment: incrementKm * 1000 } },
        })
      : activeSession
        ? prisma.fieldWorkSession.update({ where: { id: activeSession.id }, data: { lastLocationAt: recordedAt } })
        : Promise.resolve(null),
  ]);

  if (suspicious) {
    // Not surfaced to the admin map (lastLat/lastLng were deliberately left unmoved above) - only
    // logged server-side for diagnosis, per "mark/reject suspicious points" rather than pretending
    // the reading never arrived.
    console.warn(
      `[gps] flagged suspicious jump for salesperson ${salespersonId}: ${distanceKm.toFixed(2)}km in ${dtSecForJumpCheck.toFixed(1)}s`
    );
    return { stored: true, suspicious: true, ping };
  }

  try {
    getIO()
      .to(`admins:${tenantId}`)
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

  return { stored: true, ping, todayDistanceKm: sp.todayDistanceKm };
}

export default router;
