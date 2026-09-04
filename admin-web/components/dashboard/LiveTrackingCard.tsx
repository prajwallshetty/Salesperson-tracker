"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { api } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { relativeTime } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { LiveTrackingMap } from "@/components/maps/LiveTrackingMap";
import type { LiveSalesperson } from "@/types";

const STALE_MS = 3 * 60 * 1000;
function isStale(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true;
  return Date.now() - new Date(lastSeenAt).getTime() > STALE_MS;
}

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

  if (loading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_190px]">
      <div className="h-56 overflow-hidden rounded-xl border border-border/60">
        {positioned.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={<Radar className="size-5" />} title="No one on field" message="No active salespersons right now." />
          </div>
        ) : (
          <LiveTrackingMap salespeople={items} isStale={isStale} className="h-full w-full" interactive={false} showNavigation={false} />
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
