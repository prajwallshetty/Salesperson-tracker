"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { formatTime } from "@/lib/format";
import { SalesGridMap, type SalesGridMapHandle } from "@/components/maps/SalesGridMap";
import { endMarkerElement, replayMarkerElement, startMarkerElement, visitMarkerElement } from "@/components/maps/VisitMarker";
import type { LocationPing, Visit } from "@/types";

const ROUTE_SOURCE_ID = "route-history-line";
const ROUTE_LAYER_ID = "route-history-line-layer";

const OUTCOME_LABEL: Record<string, string> = {
  ORDER_PLACED: "Order Placed",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  NOT_INTERESTED: "Not Interested",
  NO_RESPONSE: "No Response",
  PAYMENT_COLLECTED: "Payment Collected",
  OTHER: "Other",
};

interface RouteMapProps {
  points: LocationPing[];
  stops: Visit[];
  /** Index into `points` for the replay scrubber marker. */
  cursor: number;
  className?: string;
}

/**
 * Renders a historical GPS route (actual recorded points only - never a straight line
 * guessed between customer visits) as a GeoJSON LineString, plus start/end/check-in
 * markers. Separate component from LiveTrackingMap: this is CURRENT-LOCATION-agnostic
 * historical data and must never be overwritten by a live location update elsewhere.
 */
export function RouteMap({ points, stops, cursor, className }: RouteMapProps) {
  const mapHandleRef = useRef<SalesGridMapHandle>(null);
  const staticMarkersRef = useRef<maplibregl.Marker[]>([]);
  const replayMarkerRef = useRef<maplibregl.Marker | null>(null);

  // [lng, lat] - MapLibre/GeoJSON coordinate order.
  const positions: [number, number][] = points.map((p) => [p.lng, p.lat]);
  const firstPosition = positions[0];

  // Draw the route line + start/end/stop markers whenever the loaded route changes.
  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map || positions.length === 0) return;

    const draw = () => {
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: positions },
      };
      const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: geojson });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#7c3aed", "line-width": 4, "line-opacity": 0.85 },
        });
      }

      staticMarkersRef.current.forEach((m) => m.remove());
      staticMarkersRef.current = [];

      const startMarker = new maplibregl.Marker({ element: startMarkerElement(), anchor: "center" })
        .setLngLat(positions[0])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(`Start · ${formatTime(points[0].recordedAt)}`))
        .addTo(map);
      const endMarker = new maplibregl.Marker({ element: endMarkerElement(), anchor: "center" })
        .setLngLat(positions[positions.length - 1])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(`End · ${formatTime(points[points.length - 1].recordedAt)}`))
        .addTo(map);
      staticMarkersRef.current.push(startMarker, endMarker);

      stops.forEach((s) => {
        if (!s.checkInLat || !s.checkInLng) return;
        const html = `<div style="font-size:12px;line-height:1.4;">
          <p style="font-weight:600;margin-bottom:2px;">${s.customer?.name ?? "Customer"}</p>
          <p>Check-in: ${s.checkInAt ? formatTime(s.checkInAt) : "-"}</p>
          <p>Check-out: ${s.checkOutAt ? formatTime(s.checkOutAt) : "-"}</p>
          ${s.outcome ? `<p style="margin-top:4px;">Outcome: ${OUTCOME_LABEL[s.outcome] ?? s.outcome}</p>` : ""}
        </div>`;
        const marker = new maplibregl.Marker({ element: visitMarkerElement(), anchor: "center" })
          .setLngLat([s.checkInLng as number, s.checkInLat as number])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(html))
          .addTo(map);
        staticMarkersRef.current.push(marker);
      });

      const bounds = positions.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(positions[0], positions[0]));
      if (positions.length === 1) map.setCenter(positions[0]);
      else map.fitBounds(bounds, { padding: 48, duration: 0 });
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, stops]);

  // Replay scrubber marker - moves independently of the static route/markers above.
  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map || !positions[cursor]) return;
    if (!replayMarkerRef.current) {
      replayMarkerRef.current = new maplibregl.Marker({ element: replayMarkerElement(), anchor: "center" }).addTo(map);
    }
    replayMarkerRef.current.setLngLat(positions[cursor]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, positions]);

  useEffect(
    () => () => {
      staticMarkersRef.current.forEach((m) => m.remove());
      replayMarkerRef.current?.remove();
    },
    []
  );

  return <SalesGridMap ref={mapHandleRef} center={firstPosition} zoom={13} className={className} />;
}
