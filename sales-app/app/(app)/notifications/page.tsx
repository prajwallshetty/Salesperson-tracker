"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import type { AppNotification } from "@/types";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<{ items: AppNotification[]; unreadCount: number }>("/notifications")
      .then((res) => setItems(res.data.items))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load notifications")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    if (!socket) return;
    const handler = (n: AppNotification) => setItems((prev) => [n, ...prev]);
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not mark as read"));
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All caught up");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update notifications"));
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        right={
          unreadCount > 0 && (
            <button onClick={markAllRead} disabled={markingAll} className="text-xs font-bold text-primary disabled:opacity-60">
              Mark all read
            </button>
          )
        }
      />
      <div className="px-4 pt-4">
        {loading ? (
          <SkeletonList count={5} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Bell />} title="No notifications" message="You'll see updates here as they come in." />
        ) : (
          <ul className="space-y-2.5">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={cn(
                  "rounded-2xl border p-4 shadow-card transition-colors",
                  n.read ? "border-border/60 bg-card" : "border-primary/25 bg-primary-soft"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{n.title}</p>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">{format(new Date(n.createdAt), "d MMM, h:mm a")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
