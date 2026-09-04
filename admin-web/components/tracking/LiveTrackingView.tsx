"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { formatCurrency, formatNumber, formatTime, relativeTime } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { LiveTrackingMap } from "@/components/maps/LiveTrackingMap";
import { GeocodeSearch, type GeocodeResult } from "@/components/tracking/GeocodeSearch";
import { ConnectionStatus } from "@/components/tracking/ConnectionStatus";
import { IconMap } from "@/components/icons";
import type { LiveSalesperson } from "@/types";

// A location is only trusted as "live" if it's fresher than this - matches the server's
// own /tracking/live isOnline-staleness window, so the UI never contradicts the backend.
const STALE_MS = 3 * 60 * 1000;

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

function isStale(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true;
  return Date.now() - new Date(lastSeenAt).getTime() > STALE_MS;
}

export default function LiveTrackingView() {
  const router = useRouter();
  const [items, setItems] = useState<LiveSalesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const [searchResult, setSearchResult] = useState<GeocodeResult | null>(null);

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
              lastHeading: payload.heading ?? null,
              lastAccuracy: null,
              lastSeenAt: payload.recordedAt,
              todayDistanceKm: payload.todayDistanceKm,
              todayVisits: 0,
              todaySales: 0,
              todayCollections: 0,
              currentCustomerId: null,
              currentCustomer: null,
              currentVisitId: null,
              currentVisitStatus: "NONE",
            },
          ];
        }
        // Only this one salesperson's record changes identity - sibling array entries
        // (and thus the markers built from them) keep their existing reference and
        // don't re-render just because a different salesperson moved.
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          lastLat: payload.lat,
          lastLng: payload.lng,
          lastSpeed: payload.speed ?? next[idx].lastSpeed,
          lastHeading: payload.heading ?? next[idx].lastHeading,
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
  // NOTE on clustering: deliberately not added yet. The seeded demo data has 8
  // salespersons total; a clustering layer earns its place once markers actually start
  // overlapping at a real deployment's scale, not before. The current per-marker DOM
  // approach comfortably handles low hundreds of markers - if real usage grows well past
  // that, switch LiveTrackingMap's marker rendering to a clustered GeoJSON symbol layer
  // (MapLibre supports `cluster: true` natively on GeoJSON sources) rather than
  // individual maplibregl.Marker DOM elements, at the cost of losing per-marker custom
  // avatar HTML in favor of icon-image sprites.

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      <PageHeader
        title="Live Tracking"
        description="Real-time location of your field sales team."
        actions={
          <div className="flex items-center gap-4 text-sm">
            <ConnectionStatus />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-full bg-success" /> Online ({items.filter((i) => i.isOnline && !isStale(i.lastSeenAt)).length})
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-full bg-muted-foreground/40" /> Offline ({items.filter((i) => !i.isOnline || isStale(i.lastSeenAt)).length})
            </span>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card shadow-card">
          <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-foreground">
            Active Salespersons ({items.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<IconMap className="size-5" />} title="No active salespersons" message="No one is currently on field duty." />
              </div>
            ) : (
              items.map((sp) => {
                const stale = isStale(sp.lastSeenAt);
                return (
                  <button
                    key={sp.id}
                    onClick={() => setSelectedId(sp.id)}
                    className={`flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-muted/60 ${
                      selectedId === sp.id ? "bg-primary-soft" : ""
                    }`}
                  >
                    <Avatar name={sp.name} src={sp.avatarUrl} online={sp.isOnline && !stale} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{sp.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sp.territory ?? "Unassigned"} &middot; {relativeTime(sp.lastSeenAt)}
                        {stale && sp.isOnline && <span className="ml-1 text-warning">&middot; stale</span>}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-border/60">
          <LiveTrackingMap
            salespeople={items}
            isStale={isStale}
            selectedId={selectedId}
            onSelectMarker={setSelectedId}
            searchResult={searchResult}
            className="h-full w-full"
            showGeolocate
          />

          <GeocodeSearch className="absolute left-4 right-4 top-4 z-10 sm:right-auto" onSelect={setSearchResult} />

          {selected && (
            <div className="absolute bottom-4 right-4 top-4 w-72 overflow-y-auto rounded-2xl border border-border/60 bg-card/95 p-4 shadow-card-hover backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={selected.name} src={selected.avatarUrl} online={selected.isOnline && !isStale(selected.lastSeenAt)} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.territory ?? "Unassigned"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setSelectedId(null)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <DetailRow
                  label="Status"
                  value={
                    !selected.isOnline
                      ? "Offline"
                      : isStale(selected.lastSeenAt)
                        ? "Stale (no recent GPS)"
                        : "Live"
                  }
                />
                <DetailRow label="Field work" value={selected.fieldWorkStatus.replace("_", " ")} />
                <DetailRow label="Field work started" value={selected.fieldWorkStartAt ? formatTime(selected.fieldWorkStartAt) : "-"} />
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
                <DetailRow
                  label="Heading"
                  value={selected.lastHeading !== null && selected.lastHeading !== undefined ? `${Math.round(selected.lastHeading)}°` : "-"}
                />
                <DetailRow
                  label="GPS accuracy"
                  value={selected.lastAccuracy !== null && selected.lastAccuracy !== undefined ? `±${Math.round(selected.lastAccuracy)}m` : "-"}
                />
                <DetailRow label="Distance today" value={`${selected.todayDistanceKm.toFixed(1)} km`} />
                <div className="my-2 h-px bg-border/60" />
                <DetailRow label="Visits today" value={formatNumber(selected.todayVisits)} />
                <DetailRow label="Sales today" value={formatCurrency(selected.todaySales)} />
                <DetailRow label="Collections today" value={formatCurrency(selected.todayCollections)} />
                <div className="my-2 h-px bg-border/60" />
                <DetailRow label="Current customer" value={selected.currentCustomer ?? "None"} />
                <DetailRow label="Visit status" value={selected.currentVisitStatus.replace("_", " ")} />
              </div>
              <div className="mt-4 space-y-2">
                {selected.currentCustomerId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => router.push(`/customers/${selected.currentCustomerId}`)}
                  >
                    View current customer
                  </Button>
                )}
                <Button className="w-full" size="sm" onClick={() => router.push(`/routes?salespersonId=${selected.id}`)}>
                  View route history
                </Button>
              </div>
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
