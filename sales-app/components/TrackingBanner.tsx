"use client";

import { AlertTriangle, Satellite } from "lucide-react";
import { useFieldWorkStore } from "@/store/fieldwork";

// Above this GPS accuracy (meters), a fix is unreliable enough for field visit/route data that
// the salesperson should be told, not just silently logged — see API_CONTRACT.md's tracking
// section (lastAccuracy) and the app spec's GPS error-state requirements.
const POOR_ACCURACY_THRESHOLD_M = 100;

/**
 * Persistent, unmissable indicator of live GPS tracking health — shown across every screen
 * while field work is active. Must never fail silently: permission-denied, GPS-disabled/
 * unavailable, and poor-accuracy states all surface here with plain-text status (not just an
 * icon), matching whatever `lib/geolocation.ts` + the field-work store already detect.
 */
export function TrackingBanner() {
  const tracking = useFieldWorkStore((s) => s.tracking);
  const status = useFieldWorkStore((s) => s.status);
  const geoErrorMessage = useFieldWorkStore((s) => s.geoErrorMessage);
  const lastPoint = useFieldWorkStore((s) => s.lastPoint);

  // Nothing to show once field work has genuinely ended and there's no lingering GPS problem to
  // report — avoids nagging with a permanent "tracking stopped" banner on every screen.
  if (!tracking && status !== "ACTIVE" && !geoErrorMessage) return null;

  if (geoErrorMessage) {
    return (
      <div className="flex items-center justify-center gap-2 bg-danger px-4 py-1.5 text-center text-xs font-semibold text-danger-foreground">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{geoErrorMessage}</span>
      </div>
    );
  }

  if (!tracking) return null;

  const accuracy = lastPoint?.accuracy ?? null;
  const poorAccuracy = accuracy != null && accuracy > POOR_ACCURACY_THRESHOLD_M;

  if (poorAccuracy) {
    return (
      <div className="flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-center text-xs font-semibold text-warning-foreground">
        <Satellite className="h-3.5 w-3.5 shrink-0" />
        <span>Poor GPS accuracy (±{Math.round(accuracy)}m) — tracking active but imprecise</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-success px-4 py-1.5 text-xs font-semibold text-success-foreground">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-white" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span>Tracking active{accuracy != null ? ` · ±${Math.round(accuracy)}m accuracy` : ""}</span>
    </div>
  );
}
