"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import { api } from "@/lib/api";
import { subscribe } from "@/lib/socket";
import { relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
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
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Bell className="size-4" />
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Check className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Bell className="size-5" />} title="No notifications yet" message="You'll see updates from the field here." />
            </div>
          ) : (
            items.slice(0, 20).map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/60",
                  !n.isRead && "bg-primary-soft/40"
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                </div>
                <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[11px] text-muted-foreground/70">{relativeTime(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border/60 p-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setOpen(false);
              router.push("/notifications");
            }}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
