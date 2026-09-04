"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import maplibregl from "maplibre-gl";
import { api, apiErrorMessage } from "@/lib/api";
import { formatTime, todayIso } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPause, IconPlay } from "@/components/icons";
import { LiveMap, type LiveMapHandle } from "@/components/maps/LiveMap";
import { endMarkerElement, replayMarkerElement, startMarkerElement, stopMarkerElement } from "@/components/maps/markerIcons";
import { cn } from "@/lib/utils";
import type { RouteHistoryResponse } from "@/types";

const OUTCOME_LABEL: Record<string, string> = {
  ORDER_PLACED: "Order Placed",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  NOT_INTERESTED: "Not Interested",
  NO_RESPONSE: "No Response",
  PAYMENT_COLLECTED: "Payment Collected",
  OTHER: "Other",
};

const ROUTE_SOURCE_ID = "route-history-line";
const ROUTE_LAYER_ID = "route-history-line-layer";

interface RouteHistoryPanelProps {
  salespersonId: string;
  salespersonName?: string;
}

export default function RouteHistoryPanel({ salespersonId, salespersonName }: RouteHistoryPanelProps) {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<RouteHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(4);
  const timerRef = useRef<number | null>(null);
  const mapHandleRef = useRef<LiveMapHandle>(null);
  const staticMarkersRef = useRef<maplibregl.Marker[]>([]);
  const replayMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    setLoading(true);
    setPlaying(false);
    setCursor(0);
    api
      .get(`/tracking/${salespersonId}/route`, { params: { date } })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load route history")))
      .finally(() => setLoading(false));
  }, [salespersonId, date]);

  const points = data?.points ?? [];
  // [lng, lat] - MapLibre/GeoJSON coordinate order, kept separate from historical route rendering
  // logic so a live-tracking marker elsewhere is never confused with this replay data.
  const positions = useMemo<[number, number][]>(() => points.map((p) => [p.lng, p.lat]), [points]);

  useEffect(() => {
    if (!playing || points.length === 0) return;
    timerRef.current = window.setInterval(() => {
      setCursor((c) => {
        if (c >= points.length - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, Math.max(80, 600 / speed));
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, speed, points.length]);

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

      (data?.stops ?? []).forEach((s) => {
        if (!s.checkInLat || !s.checkInLng) return;
        const html = `<div style="font-size:12px;line-height:1.4;">
          <p style="font-weight:600;margin-bottom:2px;">${s.customer?.name ?? "Customer"}</p>
          <p>Check-in: ${s.checkInAt ? formatTime(s.checkInAt) : "-"}</p>
          <p>Check-out: ${s.checkOutAt ? formatTime(s.checkOutAt) : "-"}</p>
          ${s.outcome ? `<p style="margin-top:4px;">Outcome: ${OUTCOME_LABEL[s.outcome] ?? s.outcome}</p>` : ""}
        </div>`;
        const marker = new maplibregl.Marker({ element: stopMarkerElement(), anchor: "center" })
          .setLngLat([s.checkInLng as number, s.checkInLat as number])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(html))
          .addTo(map);
        staticMarkersRef.current.push(marker);
      });

      const bounds = positions.reduce(
        (b, p) => b.extend(p),
        new maplibregl.LngLatBounds(positions[0], positions[0])
      );
      if (positions.length === 1) map.setCenter(positions[0]);
      else map.fitBounds(bounds, { padding: 48, duration: 0 });
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, data?.stops]);

  // Replay scrubber marker - moves independently of the static route/markers above.
  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map || !positions[cursor]) return;
    if (!replayMarkerRef.current) {
      replayMarkerRef.current = new maplibregl.Marker({ element: replayMarkerElement(), anchor: "center" }).addTo(map);
    }
    replayMarkerRef.current.setLngLat(positions[cursor]);
  }, [cursor, positions]);

  useEffect(
    () => () => {
      staticMarkersRef.current.forEach((m) => m.remove());
      replayMarkerRef.current?.remove();
    },
    []
  );

  const isToday = date === todayIso();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Date</label>
          <Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
        <Badge variant={isToday ? "success" : "muted"}>
          {isToday ? "Viewing Live Day (Today)" : `Viewing route history for ${date}`}
        </Badge>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : !data || points.length === 0 ? (
        <EmptyState title="No route data" message={`No GPS trail recorded for ${salespersonName ?? "this salesperson"} on ${date}.`} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Distance" value={`${data.distanceKm.toFixed(1)} km`} />
            <SummaryStat label="Duration" value={`${Math.round(data.durationMin)} min`} />
            <SummaryStat label="Start" value={data.start ? formatTime(data.start.recordedAt) : "-"} />
            <SummaryStat label="End" value={data.end ? formatTime(data.end.recordedAt) : "-"} />
          </div>

          <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-border/60">
            <LiveMap ref={mapHandleRef} center={positions[0]} zoom={13} className="h-full w-full" />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <Button
              size="icon"
              className="rounded-full"
              onClick={() => {
                if (cursor >= points.length - 1) setCursor(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? <IconPause className="size-4" /> : <IconPlay className="size-4 translate-x-[1px]" />}
            </Button>
            <input
              type="range"
              min={0}
              max={points.length - 1}
              value={cursor}
              onChange={(e) => {
                setPlaying(false);
                setCursor(Number(e.target.value));
              }}
              className="flex-1 accent-primary"
            />
            <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
              {points[cursor] ? formatTime(points[cursor].recordedAt) : "-"}
            </span>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {[1, 4, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition",
                    speed === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {data.stops.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card shadow-card">
              <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-foreground">Visit Stops</div>
              <div className="divide-y divide-border/40">
                {data.stops.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.customer?.name ?? "Customer"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.checkInAt ? formatTime(s.checkInAt) : "-"} &rarr; {s.checkOutAt ? formatTime(s.checkOutAt) : "-"}
                      </p>
                    </div>
                    {s.outcome && <StatusBadge status={s.outcome} label={OUTCOME_LABEL[s.outcome] ?? s.outcome} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
