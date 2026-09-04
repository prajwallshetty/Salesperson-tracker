"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BASEMAP_STYLE, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/maps/basemap";

export interface SalesGridMapHandle {
  getMap: () => maplibregl.Map | null;
}

interface SalesGridMapProps {
  /** [lng, lat] - GeoJSON/MapLibre coordinate order, not [lat, lng]. */
  center?: [number, number];
  zoom?: number;
  className?: string;
  onLoad?: (map: maplibregl.Map) => void;
  showNavigation?: boolean;
  showGeolocate?: boolean;
  showFullscreen?: boolean;
  /** Disables pan/zoom/rotate for small non-interactive previews (e.g. the dashboard's
   * live-tracking widget) - the map still renders and updates markers normally. */
  interactive?: boolean;
}

/**
 * Single shared MapLibre GL initialization point for the whole app - every map
 * (live tracking, its dashboard preview, route history) renders through this component
 * instead of each duplicating map setup. Client-only by construction ("use client" plus
 * all MapLibre/DOM access inside useEffect) so it's safe to import from a Server
 * Component page as long as it's loaded via next/dynamic with ssr:false at the call site
 * (which every current consumer already does).
 *
 * MapLibre only renders coordinates it's given - it has no involvement in obtaining GPS.
 * The salesperson's device/browser captures location and sends it to the existing
 * backend; this component and its callers only ever consume already-fetched/streamed
 * coordinates from the API/socket layer.
 */
export const SalesGridMap = forwardRef<SalesGridMapHandle, SalesGridMapProps>(function SalesGridMap(
  {
    center = DEFAULT_MAP_CENTER,
    zoom = DEFAULT_MAP_ZOOM,
    className,
    onLoad,
    showNavigation = true,
    showGeolocate = false,
    showFullscreen = false,
    interactive = true,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useImperativeHandle(ref, () => ({ getMap: () => mapRef.current }), []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE,
        center,
        zoom,
        attributionControl: { compact: true },
        interactive,
      });
    } catch {
      setError("This browser could not initialize the map (WebGL may be unavailable).");
      return;
    }

    if (interactive) {
      if (showNavigation) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      if (showFullscreen) map.addControl(new maplibregl.FullscreenControl(), "top-right");
      if (showGeolocate) {
        map.addControl(
          new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
          "top-right"
        );
      }
    }

    // MapLibre emits a generic "error" event for style/tile/network failures alike -
    // surface it once instead of leaving a blank grey tile with no explanation.
    let reported = false;
    map.on("error", (e) => {
      if (reported) return;
      reported = true;
      const msg = (e?.error as { message?: string } | undefined)?.message ?? "";
      console.error("MapLibre error:", msg || e);
      setError("Map failed to load. Check your network connection and try again.");
    });

    map.on("load", () => onLoad?.(map));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Re-runs only when retryCount changes (Retry button) - center/zoom changes after
    // mount are handled imperatively by callers via getMap(), not by re-initializing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

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
});
