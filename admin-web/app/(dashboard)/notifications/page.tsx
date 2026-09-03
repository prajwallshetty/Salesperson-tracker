"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconBell } from "@/components/icons";
import { relativeTime } from "@/lib/format";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/notifications")
      .then((res) => setItems(res.data.items ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load notifications")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to mark as read"));
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch("/notifications/read-all");
      toast.success("All notifications marked read");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to mark all as read"));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread`}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAll}>
              <Check /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={<IconBell className="size-5" />} title="No notifications" message="You're all caught up. Updates from the field will appear here." />
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-muted/50",
                  !n.isRead && "bg-primary-soft/40"
                )}
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <IconBell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">{relativeTime(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
