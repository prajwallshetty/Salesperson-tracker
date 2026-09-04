"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { assetUrl } from "@/lib/api";
import { initials } from "@/lib/format";
import { SalesGridMap, type SalesGridMapHandle } from "@/components/maps/SalesGridMap";
import { useAnimatedMarkers } from "@/components/maps/useAnimatedMarkers";
import { mapMarkerElement } from "@/components/maps/MapMarker";
import { pinMarkerElement } from "@/components/maps/VisitMarker";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/maps/basemap";
import type { LiveSalesperson } from "@/types";

export interface MapSearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface LiveTrackingMapProps {
  salespeople: LiveSalesperson[];
  /** Whether a salesperson's location is fresh enough to trust as "live" - computed by
   * the caller (matches the server's own staleness window) rather than duplicated here. */
  isStale: (lastSeenAt: string | null) => boolean;
  selectedId?: string | null;
  onSelectMarker?: (id: string) => void;
  searchResult?: MapSearchResult | null;
  className?: string;
  interactive?: boolean;
  showGeolocate?: boolean;
  showNavigation?: boolean;
}

/**
 * Renders live salesperson markers on a SalesGridMap and keeps them in sync with
 * `salespeople` - reused by both the full /tracking page and the dashboard's smaller
 * live-tracking preview widget, so marker-sync logic isn't duplicated across the two.
 * A single salesperson's location changing only moves that one marker (via
 * useAnimatedMarkers' rAF interpolation), never re-renders the map or touches siblings.
 */
export function LiveTrackingMap({
  salespeople,
  isStale,
  selectedId = null,
  onSelectMarker,
  searchResult = null,
  className,
  interactive = true,
  showGeolocate = false,
  showNavigation = true,
}: LiveTrackingMapProps) {
  const mapHandleRef = useRef<SalesGridMapHandle>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const markers = useAnimatedMarkers();

  const positioned = salespeople.filter((sp) => sp.lastLat && sp.lastLng);

  // Sync markers directly on the map instance whenever the live set changes - this runs
  // outside React's render for the map itself (MapLibre owns its own canvas).
  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map) return;
    const seen = new Set<string>();
    positioned.forEach((sp) => {
      seen.add(sp.id);
      const online = sp.isOnline && !isStale(sp.lastSeenAt);
      markers.upsert(
        sp.id,
        [sp.lastLng as number, sp.lastLat as number],
        () => {
          const el = mapMarkerElement({ src: assetUrl(sp.avatarUrl), initials: initials(sp.name), online });
          if (onSelectMarker) el.addEventListener("click", () => onSelectMarker(sp.id));
          return new maplibregl.Marker({ element: el, anchor: "center" });
        },
        map
      );
      // Online/offline dot and avatar can change without lat/lng changing (e.g. staleness
      // ticking over) - refresh the element in place rather than recreating the marker,
      // which would restart its position mid-animation.
      const existingMarker = markers.get(sp.id);
      if (existingMarker) {
        const el = existingMarker.getElement();
        const fresh = mapMarkerElement({ src: assetUrl(sp.avatarUrl), initials: initials(sp.name), online });
        if (el.innerHTML !== fresh.innerHTML) el.innerHTML = fresh.innerHTML;
      }
    });
    // Drop markers for salespersons no longer in the live set - historical route data
    // (a separate concern, rendered by RouteMap) is never touched by this cleanup.
    markers.clearMissing(seen);
  });

  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    const selected = salespeople.find((sp) => sp.id === selectedId);
    if (!map || !selected?.lastLat || !selected?.lastLng) return;
    map.flyTo({ center: [selected.lastLng, selected.lastLat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map) return;
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    if (searchResult) {
      const el = pinMarkerElement("#f59e0b");
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([searchResult.lng, searchResult.lat])
        .setPopup(new maplibregl.Popup({ offset: 24 }).setText(searchResult.displayName))
        .addTo(map);
      searchMarkerRef.current = marker;
      map.flyTo({ center: [searchResult.lng, searchResult.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
    }
  }, [searchResult]);

  const handleMapLoad = (map: maplibregl.Map) => {
    const first = positioned[0];
    if (first?.lastLat && first?.lastLng) map.setCenter([first.lastLng, first.lastLat]);
    if (!interactive) {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }
  };

  return (
    <SalesGridMap
      ref={mapHandleRef}
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      className={className}
      onLoad={handleMapLoad}
      showGeolocate={showGeolocate}
      showNavigation={showNavigation}
      interactive={interactive}
    />
  );
}
