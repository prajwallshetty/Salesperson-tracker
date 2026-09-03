"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { api, apiErrorMessage } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { formatCurrency, formatNumber, relativeTime } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { onlineIcon, offlineIcon } from "@/components/tracking/mapIcons";
import { IconMap } from "@/components/icons";
import type { LiveSalesperson } from "@/types";

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bangalore

interface LocationUpdatePayload {
  salespersonId: string;
  name: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  todayDistanceKm: number;
  isOnline: boolean;
}

interface StatusPayload {
  salespersonId: string;
  isOnline: boolean;
  fieldWorkStatus: string;
}

function FlyToMarker({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [position, map]);
  return null;
}

export default function LiveTrackingView() {
  const router = useRouter();
  const [items, setItems] = useState<LiveSalesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const load = () => {
    api
      .get("/tracking/live")
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load live tracking data")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 45000);
    const tickInterval = setInterval(() => forceTick((t) => t + 1), 15000);

    const unsubLocation = subscribe<LocationUpdatePayload>("location:update", (payload) => {
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === payload.salespersonId);
        if (idx === -1) {
          return [
            ...prev,
            {
              id: payload.salespersonId,
              name: payload.name,
              avatarUrl: null,
              territory: null,
              isOnline: payload.isOnline,
              fieldWorkStatus: "ACTIVE",
              fieldWorkStartAt: null,
              lastLat: payload.lat,
              lastLng: payload.lng,
              lastSpeed: payload.speed ?? 0,
              lastSeenAt: payload.recordedAt,
              todayDistanceKm: payload.todayDistanceKm,
              todayVisits: 0,
              todaySales: 0,
              todayCollections: 0,
              currentCustomer: null,
              currentVisitStatus: "NONE",
            },
          ];
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          lastLat: payload.lat,
          lastLng: payload.lng,
          lastSpeed: payload.speed ?? next[idx].lastSpeed,
          lastSeenAt: payload.recordedAt,
          todayDistanceKm: payload.todayDistanceKm,
          isOnline: payload.isOnline,
        };
        return next;
      });
    });

    const unsubStatus = subscribe<StatusPayload>("salesperson:status", (payload) => {
      setItems((prev) =>
        prev.map((p) =>
          p.id === payload.salespersonId
            ? { ...p, isOnline: payload.isOnline, fieldWorkStatus: payload.fieldWorkStatus as LiveSalesperson["fieldWorkStatus"] }
            : p
        )
      );
    });

    return () => {
      clearInterval(interval);
      clearInterval(tickInterval);
      unsubLocation();
      unsubStatus();
    };
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const positions = useMemo(
    () => items.filter((i) => i.lastLat && i.lastLng).map((i) => ({ ...i })),
    [items]
  );
  const selectedPosition: [number, number] | null =
    selected && selected.lastLat && selected.lastLng ? [selected.lastLat, selected.lastLng] : null;

  const mapCenter: [number, number] =
    positions.length > 0 && positions[0].lastLat && positions[0].lastLng
      ? [positions[0].lastLat, positions[0].lastLng]
      : DEFAULT_CENTER;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Live Tracking</h1>
          <p className="text-sm text-slate-400">Real-time location of your field sales team.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Online ({items.filter((i) => i.isOnline).length})
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Offline ({items.filter((i) => !i.isOnline).length})
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Active Salespersons ({items.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<IconMap className="h-6 w-6" />} title="No active salespersons" message="No one is currently on field duty." />
              </div>
            ) : (
              items.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedId(sp.id)}
                  className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    selectedId === sp.id ? "bg-brand-50/60" : ""
                  }`}
                >
                  <Avatar name={sp.name} src={sp.avatarUrl} online={sp.isOnline} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{sp.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {sp.territory ?? "Unassigned"} &middot; {relativeTime(sp.lastSeenAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-slate-200">
          <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <FlyToMarker position={selectedPosition} />
            {positions.map((sp) => (
              <Marker
                key={sp.id}
                position={[sp.lastLat as number, sp.lastLng as number]}
                icon={sp.isOnline ? onlineIcon : offlineIcon}
                eventHandlers={{ click: () => setSelectedId(sp.id) }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="mb-0.5 font-semibold text-slate-700">{sp.name}</p>
                    <p>{sp.isOnline ? "Online" : "Offline"} &middot; {relativeTime(sp.lastSeenAt)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {selected && (
            <div className="absolute bottom-4 right-4 top-4 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-4 shadow-card-hover backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={selected.name} src={selected.avatarUrl} online={selected.isOnline} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
                    <p className="text-xs text-slate-400">{selected.territory ?? "Unassigned"}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600">
                  &times;
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <DetailRow label="Status" value={selected.isOnline ? "Online" : "Offline"} />
                <DetailRow label="Field work" value={selected.fieldWorkStatus.replace("_", " ")} />
                <DetailRow
                  label="Location"
                  value={
                    selected.lastLat && selected.lastLng
                      ? `${selected.lastLat.toFixed(5)}, ${selected.lastLng.toFixed(5)}`
                      : "-"
                  }
                />
                <DetailRow label="Last updated" value={relativeTime(selected.lastSeenAt)} />
                <DetailRow label="Speed" value={selected.lastSpeed ? `${selected.lastSpeed.toFixed(1)} km/h` : "-"} />
                <DetailRow label="Distance today" value={`${selected.todayDistanceKm.toFixed(1)} km`} />
                <div className="my-2 h-px bg-slate-100" />
                <DetailRow label="Visits today" value={formatNumber(selected.todayVisits)} />
                <DetailRow label="Sales today" value={formatCurrency(selected.todaySales)} />
                <DetailRow label="Collections today" value={formatCurrency(selected.todayCollections)} />
                <div className="my-2 h-px bg-slate-100" />
                <DetailRow label="Current customer" value={selected.currentCustomer ?? "None"} />
                <DetailRow label="Visit status" value={selected.currentVisitStatus.replace("_", " ")} />
              </div>
              <button
                onClick={() => router.push(`/routes?salespersonId=${selected.id}`)}
                className="mt-4 block w-full rounded-lg bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                View route history
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}
