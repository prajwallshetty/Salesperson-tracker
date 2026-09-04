"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { Radar } from "lucide-react";
import { api, assetUrl } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { relativeTime, initials } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { LiveMap, type LiveMapHandle } from "@/components/maps/LiveMap";
import { useAnimatedMarkers } from "@/components/maps/useAnimatedMarkers";
import { avatarMarkerElement } from "@/components/maps/markerIcons";
import type { LiveSalesperson } from "@/types";

const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // [lng, lat]

interface LocationUpdatePayload {
  salespersonId: string;
  lat: number;
  lng: number;
  recordedAt: string;
  isOnline: boolean;
}

export default function LiveTrackingCard() {
  const router = useRouter();
  const [items, setItems] = useState<LiveSalesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const mapHandleRef = useRef<LiveMapHandle>(null);
  const markers = useAnimatedMarkers();

  useEffect(() => {
    api
      .get("/tracking/live")
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

    // Keep this preview genuinely live instead of a snapshot frozen at mount time - same
    // event the full /tracking page consumes, so a salesperson's dot here matches reality.
    const unsubscribe = subscribe<LocationUpdatePayload>("location:update", (payload) => {
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === payload.salespersonId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          lastLat: payload.lat,
          lastLng: payload.lng,
          lastSeenAt: payload.recordedAt,
          isOnline: payload.isOnline,
        };
        return next;
      });
    });
    return unsubscribe;
  }, []);

  const positioned = items.filter((i) => i.lastLat && i.lastLng);
  const onlineCount = items.filter((i) => i.isOnline).length;

  // Sync markers on the small preview map the same way the full tracking page does -
  // one marker per salesperson, moved in place rather than the map being rebuilt.
  useEffect(() => {
    const map = mapHandleRef.current?.getMap();
    if (!map) return;
    const seen = new Set<string>();
    positioned.forEach((sp) => {
      seen.add(sp.id);
      markers.upsert(
        sp.id,
        [sp.lastLng as number, sp.lastLat as number],
        () => new maplibregl.Marker({ element: avatarMarkerElement({ src: assetUrl(sp.avatarUrl), initials: initials(sp.name), online: sp.isOnline, size: 28 }), anchor: "center" }),
        map
      );
    });
    markers.clearMissing(seen);
  });

  const handleMapLoad = (map: maplibregl.Map) => {
    map.scrollZoom.disable();
    map.dragPan.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    const first = positioned[0];
    if (first?.lastLat && first?.lastLng) map.setCenter([first.lastLng, first.lastLat]);
  };

  if (loading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_190px]">
      <div className="h-56 overflow-hidden rounded-xl border border-border/60">
        {positioned.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={<Radar className="size-5" />} title="No one on field" message="No active salespersons right now." />
          </div>
        ) : (
          <LiveMap ref={mapHandleRef} center={DEFAULT_CENTER} zoom={11} className="h-full w-full" onLoad={handleMapLoad} showNavigation={false} />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="mb-0.5 text-xs font-medium text-muted-foreground">{onlineCount} online now</p>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {items.slice(0, 4).map((sp) => (
            <div key={sp.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
              <Avatar name={sp.name} src={sp.avatarUrl} size="xs" online={sp.isOnline} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{sp.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{relativeTime(sp.lastSeenAt)}</p>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="px-1.5 text-xs text-muted-foreground">Nobody active right now.</p>}
        </div>
        <button
          onClick={() => router.push("/tracking")}
          className="mt-1 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          Open full map
        </button>
      </div>
    </div>
  );
}
