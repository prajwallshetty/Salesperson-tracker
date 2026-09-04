"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BASEMAP_STYLE, DEFAULT_MAP_ZOOM } from "@/lib/maps/basemap";
import type { Customer } from "@/types";

interface NearbyMapProps {
  /** The salesperson's own current position, from the real browser Geolocation API - never a
   * fabricated or map-clicked point. */
  currentPosition: { lat: number; lng: number };
  customers: Customer[];
  onSelectCustomer?: (customerId: string) => void;
  className?: string;
}

/**
 * Lightweight MapLibre view for the sales app: just "where am I" plus nearby assigned
 * customers, no live-fleet-tracking/admin-panel complexity. Mirrors admin-web's SalesGridMap
 * initialization pattern (same basemap, same error/retry handling) but the two apps are
 * separate Next.js packages with no shared UI workspace, so this is a smaller, purpose-built
 * component rather than an import of the admin one.
 */
export function NearbyMap({ currentPosition, customers, onSelectCustomer, className }: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarkerRef = useRef<maplibregl.Marker | null>(null);
  const customerMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE,
        center: [currentPosition.lng, currentPosition.lat],
        zoom: DEFAULT_MAP_ZOOM,
        attributionControl: { compact: true },
      });
    } catch {
      setError("This device could not initialize the map (WebGL may be unavailable).");
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    let reported = false;
    map.on("error", (e) => {
      if (reported) return;
      reported = true;
      const msg = (e?.error as { message?: string } | undefined)?.message ?? "";
      console.error("MapLibre error:", msg || e);
      setError("Map failed to load. Check your network connection and try again.");
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Re-runs only on Retry - subsequent position/customer changes are applied imperatively below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // Keep the "you are here" marker in sync with the latest real GPS fix.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = document.createElement("div");
    el.className = "h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.35)]";
    if (meMarkerRef.current) {
      meMarkerRef.current.setLngLat([currentPosition.lng, currentPosition.lat]);
    } else {
      meMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([currentPosition.lng, currentPosition.lat]).addTo(map);
    }
  }, [currentPosition.lat, currentPosition.lng]);

  // Rebuild customer markers whenever the nearby list changes (radius change, refresh).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    customerMarkersRef.current.forEach((m) => m.remove());
    customerMarkersRef.current = customers
      .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
      .map((c) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow-lg";
        el.textContent = c.name.charAt(0).toUpperCase();
        el.addEventListener("click", () => onSelectCustomer?.(c.id));
        return new maplibregl.Marker({ element: el })
          .setLngLat([c.lng as number, c.lat as number])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(c.name))
          .addTo(map);
      });
  }, [customers, onSelectCustomer]);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/40 p-4 text-center", className)}>
        <div className="max-w-xs">
          <AlertTriangle className="mx-auto mb-2 size-5 text-warning" />
          <p className="text-sm font-medium text-foreground">Unable to load map</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setRetryCount((c) => c + 1);
            }}
            className="mt-3 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
