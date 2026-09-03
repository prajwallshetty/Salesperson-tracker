"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { relativeTime } from "@/lib/format";
import { IconBell, IconCheck } from "@/components/icons";
import { EmptyState } from "@/components/EmptyState";
import type { Notification } from "@/types";

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = async () => {
    try {
      const res = await api.get("/notifications");
      setItems(res.data.items ?? []);
      setUnread(res.data.unreadCount ?? 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load();
    const unsub = subscribe<Notification>("notification:new", (payload) => {
      setItems((prev) => [{ ...payload, id: `temp-${Date.now()}`, isRead: false } as Notification, ...prev].slice(0, 100));
      setUnread((n) => n + 1);
      toast.custom(
        () => (
          <div className="pointer-events-auto flex w-80 items-start gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-popover">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <IconBell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{payload.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{payload.message}</p>
            </div>
          </div>
        ),
        { duration: 4500 }
      );
      load();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((n) => Math.max(0, n - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // no-op
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      // no-op
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
        aria-label="Notifications"
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-xl border border-slate-200 bg-white shadow-card-hover">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <IconCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No notifications yet" message="You'll see updates from the field here." />
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    !n.isRead ? "bg-brand-50/40" : ""
                  }`}
                >
                  <div className="flex w-full items-center gap-2">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                    <span className="truncate text-sm font-medium text-slate-700">{n.title}</span>
                  </div>
                  <span className="line-clamp-2 text-xs text-slate-500">{n.message}</span>
                  <span className="text-[11px] text-slate-350 text-slate-400">{relativeTime(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
