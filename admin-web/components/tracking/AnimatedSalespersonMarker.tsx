"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { relativeTime } from "@/lib/format";
import { assetUrl } from "@/lib/api";
import { initials } from "@/lib/format";
import { avatarMarkerIcon } from "@/components/tracking/mapIcons";
import type { LiveSalesperson } from "@/types";

// Interpolates lat/lng toward the latest value over `durationMs` instead of jumping —
// only this marker's own React state changes on each tick, so sibling markers, the
// tile layer, and the rest of the page never re-render because of it.
function useAnimatedLatLng(lat: number, lng: number, durationMs = 1400): [number, number] {
  const [display, setDisplay] = useState<[number, number]>([lat, lng]);
  const displayRef = useRef<[number, number]>([lat, lng]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    const to: [number, number] = [lat, lng];
    if (from[0] === to[0] && from[1] === to[1]) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t); // ease-out — starts fast, settles gently
      const next: [number, number] = [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased];
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [lat, lng, durationMs]);

  return display;
}

interface AnimatedSalespersonMarkerProps {
  sp: LiveSalesperson;
  onClick: () => void;
}

export function AnimatedSalespersonMarker({ sp, onClick }: AnimatedSalespersonMarkerProps) {
  const position = useAnimatedLatLng(sp.lastLat as number, sp.lastLng as number);
  const icon = useMemo(
    () => avatarMarkerIcon({ src: assetUrl(sp.avatarUrl), initials: initials(sp.name), online: sp.isOnline }),
    [sp.avatarUrl, sp.isOnline, sp.name]
  );

  return (
    <Marker position={position} icon={icon} eventHandlers={{ click: onClick }}>
      <Popup>
        <div className="text-xs">
          <p className="mb-0.5 font-semibold text-slate-700">{sp.name}</p>
          <p>
            {sp.isOnline ? "Online" : "Offline"} &middot; {relativeTime(sp.lastSeenAt)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
