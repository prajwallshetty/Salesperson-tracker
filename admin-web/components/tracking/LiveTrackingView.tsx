"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import { X } from "lucide-react";
import { api, apiErrorMessage, assetUrl } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { formatCurrency, formatNumber, formatTime, initials, relativeTime } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MapboxMap, type MapboxMapHandle } from "@/components/maps/MapboxMap";
import { useAnimatedMarkers } from "@/components/maps/useAnimatedMarkers";
import { avatarMarkerElement, pinMarkerElement } from "@/components/maps/markerIcons";
import { GeocodeSearch, type GeocodeResult } from "@/components/tracking/GeocodeSearch";
import { ConnectionStatus } from "@/components/tracking/ConnectionStatus";
import { IconMap } from "@/components/icons";
import type { LiveSalesperson } from "@/types";

const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // [lng, lat] - Bangalore

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
  const mapHandleRef = useRef<MapboxMapHandle>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markers = useAnimatedMarkers();

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
  // NOTE on clustering: deliberately not added. The seeded demo data has 8 salespersons
  // total, and a clustering library earns its place once markers actually start
  // overlapping at the default zoom, not before. Revisit if the real count grows into
  // the dozens+.
  const positions = useMemo(() => items.filter((i) => i.lastLat && i.lastLng), [items]);

  // Sync markers directly on the map instance whenever `positions` changes - this runs
  // outside React's render for the map itself (Mapbox owns its own canvas), so a single
  // salesperson moving updates exactly one marker via useAnimatedMarkers' interpolation,
  // never the whole map or unrelated DOM.
  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map) return;
    const seen = new Set<string>();
    positions.forEach((sp) => {
      seen.add(sp.id);
      markers.upsert(
        sp.id,
        [sp.lastLng as number, sp.lastLat as number],
        () => {
          const el = avatarMarkerElement({ src: assetUrl(sp.avatarUrl), initials: initials(sp.name), online: sp.isOnline && !isStale(sp.lastSeenAt) });
          el.addEventListener("click", () => setSelectedId(sp.id));
          return new mapboxgl.Marker({ element: el, anchor: "center" });
        },
        map
      );
      // Online/offline dot and avatar can change without lat/lng changing (e.g. staleness
      // ticking over, or an avatar URL loading in later) - refresh the element in place
      // rather than recreating the marker, which would restart its position mid-animation.
      const existingMarker = markers.get(sp.id);
      if (existingMarker) {
        const el = existingMarker.getElement();
        const fresh = avatarMarkerElement({ src: assetUrl(sp.avatarUrl), initials: initials(sp.name), online: sp.isOnline && !isStale(sp.lastSeenAt) });
        if (el.innerHTML !== fresh.innerHTML) el.innerHTML = fresh.innerHTML;
      }
    });
    // Drop markers for salespersons no longer in the live set.
    markers.clearMissing(seen);
  });

  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map || !selected || !selected.lastLat || !selected.lastLng) return;
    map.flyTo({ center: [selected.lastLng, selected.lastLat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map) return;
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    if (searchResult) {
      const el = pinMarkerElement("#f59e0b");
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([searchResult.lng, searchResult.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText(searchResult.displayName))
        .addTo(map);
      searchMarkerRef.current = marker;
      map.flyTo({ center: [searchResult.lng, searchResult.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
    }
  }, [searchResult]);

  const handleMapLoad = (map: mapboxgl.Map) => {
    const first = positions[0];
    if (first?.lastLat && first?.lastLng) {
      map.setCenter([first.lastLng, first.lastLat]);
    }
  };

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
          <MapboxMap ref={mapHandleRef} center={DEFAULT_CENTER} zoom={12} className="h-full w-full" onLoad={handleMapLoad} showGeolocate />

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
