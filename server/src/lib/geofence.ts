import { haversineKm } from "../utils/geo";

// Default visit-proximity radius (meters). Configurable per deployment since "how close counts
// as at the customer" varies by how precise customer addresses are geocoded and by typical GPS
// accuracy in the field - never hard-coded past this one place.
export const VISIT_GEOFENCE_RADIUS_METERS = Number(process.env.VISIT_GEOFENCE_RADIUS_METERS) || 200;

export interface GeofenceResult {
  distanceMeters: number;
  withinRadius: boolean;
}

export function checkGeofence(
  salespersonLat: number,
  salespersonLng: number,
  customerLat: number,
  customerLng: number,
  radiusMeters: number = VISIT_GEOFENCE_RADIUS_METERS
): GeofenceResult {
  const distanceMeters = haversineKm(salespersonLat, salespersonLng, customerLat, customerLng) * 1000;
  return { distanceMeters, withinRadius: distanceMeters <= radiusMeters };
}
