"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { api, apiErrorMessage } from "@/lib/api";
import { formatTime, todayIso } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { IconPause, IconPlay } from "@/components/icons";
import { endIcon, replayIcon, startIcon, stopIcon } from "@/components/tracking/mapIcons";
import type { RouteHistoryResponse } from "@/types";

const OUTCOME_LABEL: Record<string, string> = {
  ORDER_PLACED: "Order Placed",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  NOT_INTERESTED: "Not Interested",
  NO_RESPONSE: "No Response",
  PAYMENT_COLLECTED: "Payment Collected",
  OTHER: "Other",
};

interface RouteHistoryPanelProps {
  salespersonId: string;
  salespersonName?: string;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.fitBounds(positions, { padding: [32, 32] });
    }
  }, [positions, map]);
  return null;
}

export default function RouteHistoryPanel({ salespersonId, salespersonName }: RouteHistoryPanelProps) {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<RouteHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(4);
  const timerRef = useRef<number | null>(null);

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
  const positions = useMemo<[number, number][]>(() => points.map((p) => [p.lat, p.lng]), [points]);

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

  const isToday = date === todayIso();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isToday ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {isToday ? "Viewing Live Day (Today)" : `Viewing route history for ${date}`}
        </span>
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

          <div className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-200">
            <MapContainer center={positions[0]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <FitBounds positions={positions} />
              <Polyline positions={positions} pathOptions={{ color: "#3d63f5", weight: 4, opacity: 0.85 }} />
              <Marker position={positions[0]} icon={startIcon}>
                <Popup>Start &middot; {formatTime(points[0].recordedAt)}</Popup>
              </Marker>
              <Marker position={positions[positions.length - 1]} icon={endIcon}>
                <Popup>End &middot; {formatTime(points[points.length - 1].recordedAt)}</Popup>
              </Marker>
              {data.stops.map((s) =>
                s.checkInLat && s.checkInLng ? (
                  <Marker key={s.id} position={[s.checkInLat, s.checkInLng]} icon={stopIcon}>
                    <Popup>
                      <div className="text-xs">
                        <p className="mb-1 font-semibold text-slate-700">{s.customer?.name ?? "Customer"}</p>
                        <p>Check-in: {s.checkInAt ? formatTime(s.checkInAt) : "-"}</p>
                        <p>Check-out: {s.checkOutAt ? formatTime(s.checkOutAt) : "-"}</p>
                        {s.outcome && <p className="mt-1">Outcome: {OUTCOME_LABEL[s.outcome] ?? s.outcome}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
              {positions[cursor] && <Marker position={positions[cursor]} icon={replayIcon} />}
            </MapContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <button
              onClick={() => {
                if (cursor >= points.length - 1) setCursor(0);
                setPlaying((p) => !p);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
            >
              {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4 translate-x-[1px]" />}
            </button>
            <input
              type="range"
              min={0}
              max={points.length - 1}
              value={cursor}
              onChange={(e) => {
                setPlaying(false);
                setCursor(Number(e.target.value));
              }}
              className="flex-1 accent-brand-600"
            />
            <span className="w-20 shrink-0 text-right text-xs text-slate-500">
              {points[cursor] ? formatTime(points[cursor].recordedAt) : "-"}
            </span>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {[1, 4, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                    speed === s ? "bg-white shadow-sm text-brand-600" : "text-slate-500"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {data.stops.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Visit Stops</div>
              <div className="divide-y divide-slate-50">
                {data.stops.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{s.customer?.name ?? "Customer"}</p>
                      <p className="text-xs text-slate-400">
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
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
