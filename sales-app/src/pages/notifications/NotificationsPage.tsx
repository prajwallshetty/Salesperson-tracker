import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { BellIcon } from "@/components/icons";
import type { AppNotification } from "@/types";
import { format } from "date-fns";
import clsx from "clsx";

export function NotificationsPage() {
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
            <button onClick={markAllRead} disabled={markingAll} className="text-xs font-bold text-brand-600 disabled:opacity-60">
              Mark all read
            </button>
          )
        }
      />
      <div className="px-4 pt-4">
        {loading ? (
          <SkeletonList count={5} />
        ) : items.length === 0 ? (
          <EmptyState icon={<BellIcon className="h-10 w-10 text-slate-300" />} title="No notifications" message="You'll see updates here as they come in." />
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={clsx(
                  "rounded-2xl border p-4",
                  n.read ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                </div>
                <p className="mt-1 text-xs text-slate-500">{n.message}</p>
                <p className="mt-2 text-[10px] text-slate-400">{format(new Date(n.createdAt), "d MMM, h:mm a")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
