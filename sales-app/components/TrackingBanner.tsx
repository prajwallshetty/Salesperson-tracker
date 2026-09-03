"use client";

import { useFieldWorkStore } from "@/store/fieldwork";

/** Persistent, unmissable indicator shown while GPS tracking is active. */
export function TrackingBanner() {
  const tracking = useFieldWorkStore((s) => s.tracking);
  if (!tracking) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-success px-4 py-1.5 text-xs font-semibold text-success-foreground">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-white" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      Location tracking active
    </div>
  );
}
