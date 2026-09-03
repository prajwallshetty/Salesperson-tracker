"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { IconBell, IconCheck } from "@/components/icons";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-400">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={<IconBell className="h-6 w-6" />} title="No notifications" message="You're all caught up. Updates from the field will appear here." />
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
                  !n.isRead ? "bg-brand-50/40" : ""
                }`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <IconBell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                    <p className="truncate text-sm font-medium text-slate-700">{n.title}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{relativeTime(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
