// Real browser Geolocation API wrapper. Never synthesize/randomize coordinates here.

export interface GeoPoint {
  lat: number;
  lng: number;
  speed?: number | null;
  accuracy?: number | null;
  heading?: number | null;
  recordedAt: string;
}

export type GeoErrorKind = "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED";

export class GeoError extends Error {
  kind: GeoErrorKind;
  constructor(kind: GeoErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "GeoError";
  }
}

export function friendlyGeoErrorMessage(kind: GeoErrorKind): string {
  switch (kind) {
    case "PERMISSION_DENIED":
      return "Location access is off. Enable location permission for this app in your browser/device settings to start field work.";
    case "POSITION_UNAVAILABLE":
      return "Your device could not determine its location. Check that location services (GPS) are turned on and try again.";
    case "TIMEOUT":
      return "Getting your location took too long. Move to an open area (or enable GPS) and try again.";
    case "UNSUPPORTED":
      return "This device/browser does not support location tracking, which is required for field work.";
  }
}

function toGeoError(err: GeolocationPositionError): GeoError {
  if (err.code === err.PERMISSION_DENIED) return new GeoError("PERMISSION_DENIED", err.message);
  if (err.code === err.POSITION_UNAVAILABLE) return new GeoError("POSITION_UNAVAILABLE", err.message);
  return new GeoError("TIMEOUT", err.message);
}

function positionToPoint(pos: GeolocationPosition): GeoPoint {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    speed: pos.coords.speed,
    accuracy: pos.coords.accuracy,
    heading: pos.coords.heading,
    recordedAt: new Date(pos.timestamp).toISOString(),
  };
}

export function isGeolocationSupported(): boolean {
  return "geolocation" in navigator;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const MIN_SEND_GAP_MS = 3000;
const MIN_SEND_DISTANCE_M = 25;
const MAX_SEND_INTERVAL_MS = 60000;

/**
 * Decides whether a new GPS fix is worth sending to the backend, instead of relaying every raw
 * `watchPosition` callback (which can fire multiple times a minute even while stationary under
 * `enableHighAccuracy`). A fix is sent when it represents real movement (>= MIN_SEND_DISTANCE_M,
 * which also absorbs normal consumer-GPS jitter of a few meters while stationary), or
 * unconditionally every MAX_SEND_INTERVAL_MS so a stationary salesperson still produces a
 * periodic heartbeat (keeps isOnline/lastSeenAt fresh on the admin side). Movement is deliberately
 * NOT gated by a time floor beyond a tiny anti-duplicate debounce (MIN_SEND_GAP_MS) - a salesperson
 * moving fast (e.g. by vehicle) can cover MIN_SEND_DISTANCE_M in well under a naive "wait N seconds"
 * floor, and suppressing that would compromise route accuracy for the sake of throttling that a
 * distance threshold already achieves at any realistic travel speed.
 */
export function shouldSendLocationUpdate(
  candidate: GeoPoint,
  lastSent: { point: GeoPoint; sentAtMs: number } | null
): boolean {
  if (!lastSent) return true;
  const elapsedMs = Date.now() - lastSent.sentAtMs;
  if (elapsedMs < MIN_SEND_GAP_MS) return false;
  if (elapsedMs >= MAX_SEND_INTERVAL_MS) return true;
  const movedM = haversineMeters(lastSent.point, candidate);
  return movedM >= MIN_SEND_DISTANCE_M;
}

/** One-shot fix. Rejects with GeoError on failure. Never returns a fabricated point. */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new GeoError("UNSUPPORTED", "Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(positionToPoint(pos)),
      (err) => reject(toGeoError(err)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000, ...options }
    );
  });
}

/** Continuous watch. Returns a numeric watch id to pass to clearPositionWatch. */
export function watchPosition(
  onPoint: (point: GeoPoint) => void,
  onError: (error: GeoError) => void,
  options?: PositionOptions
): number {
  if (!isGeolocationSupported()) {
    onError(new GeoError("UNSUPPORTED", "Geolocation not supported"));
    return -1;
  }
  return navigator.geolocation.watchPosition(
    (pos) => onPoint(positionToPoint(pos)),
    (err) => onError(toGeoError(err)),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000, ...options }
  );
}

export function clearPositionWatch(id: number) {
  if (id >= 0 && isGeolocationSupported()) {
    navigator.geolocation.clearWatch(id);
  }
}

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
