"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface MapboxMapHandle {
  getMap: () => mapboxgl.Map | null;
}

interface MapboxMapProps {
  /** [lng, lat] - Mapbox's coordinate order, not [lat, lng]. */
  center?: [number, number];
  zoom?: number;
  className?: string;
  onLoad?: (map: mapboxgl.Map) => void;
  showNavigation?: boolean;
  showGeolocate?: boolean;
}

const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // Bangalore, [lng, lat]

/**
 * Single shared Mapbox GL initialization point - every map on the admin dashboard
 * (live tracking, its dashboard preview, route history) renders through this component
 * instead of each duplicating map setup. Client-only by construction ("use client" plus
 * all Mapbox/DOM access inside useEffect) so it's safe to import from a Server Component
 * page as long as it's loaded via next/dynamic with ssr:false at the call site.
 */
export const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(function MapboxMap(
  { center = DEFAULT_CENTER, zoom = 11, className, onLoad, showNavigation = true, showGeolocate = false },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({ getMap: () => mapRef.current }), []);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError("Mapbox access token is not configured (set NEXT_PUBLIC_MAPBOX_TOKEN).");
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom,
        attributionControl: true,
      });
    } catch {
      setError("This browser could not initialize the map (WebGL may be unavailable).");
      return;
    }

    if (showNavigation) map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    if (showGeolocate) {
      map.addControl(
        new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
        "top-right"
      );
    }

    // Mapbox emits a generic "error" event for style/tile/network/auth failures alike -
    // surface it once instead of leaving a blank grey tile with no explanation.
    let reported = false;
    map.on("error", (e) => {
      if (reported) return;
      reported = true;
      const msg = (e?.error as { message?: string } | undefined)?.message ?? "";
      console.error("Mapbox error:", msg || e);
      setError(
        /unauthorized|access token|401|403/i.test(msg)
          ? "Map failed to load: the Mapbox token is invalid or unauthorized for this domain."
          : "Map failed to load. Check your network connection and try again."
      );
    });

    map.on("load", () => onLoad?.(map));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Initialize once. Callers reposition an already-mounted map imperatively via getMap().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/40 p-4 text-center", className)}>
        <div className="max-w-xs">
          <AlertTriangle className="mx-auto mb-2 size-5 text-warning" />
          <p className="text-sm font-medium text-foreground">Map unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
});
