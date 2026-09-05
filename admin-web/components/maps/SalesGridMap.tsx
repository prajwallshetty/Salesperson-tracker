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
  /** Fatal only: the map could not be created or its style never loaded, so there is nothing
   * to show. Replaces the map with a retry card. */
  const [error, setError] = useState<string | null>(null);
  /** Non-fatal: basemap imagery isn't loading (tile requests failing), but the map itself is
   * alive - markers, route lines and every caller-added layer still render and stay usable. */
  const [tileError, setTileError] = useState(false);
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

    // MapLibre emits one generic "error" event for style, tile and network failures alike.
    // These must NOT be treated the same: a single failed tile request (one flaky CDN
    // response, a 404 tile at high zoom, a rate-limited burst while panning) is routine and
    // recoverable - MapLibre re-requests as the user moves. Tearing the map down for one of
    // those would destroy every marker, route line and layer the caller added via getMap(),
    // which is far worse than a missing tile. So only a failure that leaves nothing to show
    // (style never loaded / map never came up) is fatal; tile failures show a non-blocking
    // banner over a still-working map.
    let loaded = false;
    let tileFailureReported = false;
    let fatalReported = false;
    map.on("error", (e) => {
      const msg = (e?.error as { message?: string } | undefined)?.message ?? "";
      const isTileFailure = Boolean((e as { sourceId?: string } | undefined)?.sourceId) || loaded;
      if (isTileFailure) {
        if (tileFailureReported) return;
        tileFailureReported = true;
        console.warn("MapLibre basemap tile error (map still usable):", msg || e);
        setTileError(true);
        return;
      }
      if (fatalReported) return;
      fatalReported = true;
      console.error("MapLibre error:", msg || e);
      setError("Map failed to load. Check your network connection and try again.");
    });

    map.on("load", () => {
      loaded = true;
      onLoad?.(map);
    });
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

  return (
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {/* Bottom-left: the top edge is occupied by the geocode search box and the map controls,
          the bottom-right by MapLibre's attribution. */}
      {tileError && (
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 p-2">
          <span className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning shadow-sm">
            <AlertTriangle className="size-3.5 shrink-0" />
            Basemap imagery unavailable - positions are still live
          </span>
        </div>
      )}
    </div>
  );
});
