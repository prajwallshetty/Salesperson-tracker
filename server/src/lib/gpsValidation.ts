// Server-side GPS quality gates. Nothing here fabricates or interpolates a point - it only
// decides whether a genuinely-received device reading is plausible enough to trust for distance/
// route calculations. A rejected/flagged point is a real reading that failed a sanity check, not
// a point this code invented.

export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= MIN_LATITUDE &&
    lat <= MAX_LATITUDE &&
    lng >= MIN_LONGITUDE &&
    lng <= MAX_LONGITUDE
  );
}

// A clock-skew allowance for "future" timestamps (device clocks drift a little) and a generous
// look-back window for "past" timestamps - the offline queue (sales-app/lib/db.ts) can legitimately
// flush points recorded hours ago once connectivity returns, so this must not reject a real queued
// point just because it's stale by the time it's finally sent.
const MAX_FUTURE_SKEW_MS = 2 * 60 * 1000;
const MAX_PAST_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isPlausibleTimestamp(recordedAt: Date, now: Date = new Date()): boolean {
  const deltaMs = recordedAt.getTime() - now.getTime();
  if (Number.isNaN(deltaMs)) return false;
  if (deltaMs > MAX_FUTURE_SKEW_MS) return false;
  if (deltaMs < -MAX_PAST_WINDOW_MS) return false;
  return true;
}

// A configurable ceiling on plausible travel speed between two consecutive points, used only to
// flag a physically-impossible jump (e.g. a bad multipath fix reporting a location hundreds of km
// away) - not a real-world speed limit on any single point. Generous enough to cover a
// salesperson travelling by car/train, deliberately not driving/walking-specific.
const MAX_PLAUSIBLE_SPEED_KMH = Number(process.env.GPS_MAX_PLAUSIBLE_SPEED_KMH) || 180;

/** True when covering `distanceKm` in `dtSeconds` would require an implausible speed. */
export function isImplausibleJump(distanceKm: number, dtSeconds: number): boolean {
  if (distanceKm <= 0) return false;
  if (dtSeconds <= 0) return true; // "instant" movement of any real distance is never plausible
  const impliedSpeedKmh = distanceKm / (dtSeconds / 3600);
  return impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH;
}

// Per-salesperson GPS ingestion throttle, applied inside recordLocationPing() so it covers BOTH
// transports a ping can arrive on (the REST /tracking/ping route AND the Socket.IO
// "location:update" event both call that one function) - an Express-only rate-limit middleware
// would miss the socket path entirely. The client already throttles to roughly one send per 25m
// of movement or 60s idle (sales-app/lib/geolocation.ts), so this ceiling is pure headroom against
// a buggy or malicious client, not a limit real usage should ever approach. In-process/in-memory
// is sufficient here (unlike auth/billing rate limits) - this only protects write-amplification
// on one server process, not a security boundary that needs to survive a restart or be shared
// across horizontally-scaled instances.
const PING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PING_RATE_LIMIT_MAX = 60;
const pingRateState = new Map<string, { windowStart: number; count: number }>();

export function isRateLimited(salespersonId: string, now: number = Date.now()): boolean {
  const state = pingRateState.get(salespersonId);
  if (!state || now - state.windowStart >= PING_RATE_LIMIT_WINDOW_MS) {
    pingRateState.set(salespersonId, { windowStart: now, count: 1 });
    return false;
  }
  state.count += 1;
  return state.count > PING_RATE_LIMIT_MAX;
}
