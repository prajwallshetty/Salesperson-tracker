"use client";

import { useSyncExternalStore } from "react";
import { getConnectionStatus, subscribeConnectionStatus } from "@/lib/socket";
import { cn } from "@/lib/utils";

const META = {
  connected: { label: "Live", dot: "bg-success", text: "text-success" },
  connecting: { label: "Reconnecting", dot: "bg-warning animate-pulse", text: "text-warning" },
  disconnected: { label: "Offline", dot: "bg-danger", text: "text-danger" },
} as const;

/** Small realtime-connection indicator - Live / Reconnecting / Offline - for pages that
 * depend on the Socket.IO location feed, so a stalled connection is visible rather than
 * silently leaving stale markers on screen.
 *
 * Uses useSyncExternalStore rather than useState+useEffect: the connection status is
 * external mutable state (a module-level variable in lib/socket.ts) that can change the
 * instant a socket someone else already opened (e.g. NotificationBell, mounted earlier in
 * the layout) finishes connecting - which can happen before this component's own effect
 * has run to subscribe. A manual useState/useEffect subscription has a real gap between
 * "capture the initial value" (at render) and "start listening for future changes" (in the
 * effect, which always runs strictly after render/commit); an update that lands in that
 * gap is silently missed and the badge gets stuck showing its stale initial value forever.
 * useSyncExternalStore is built specifically to close that gap safely. */
export function ConnectionStatus({ className }: { className?: string }) {
  const status = useSyncExternalStore(subscribeConnectionStatus, getConnectionStatus);
  const meta = META[status];

  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", meta.text, className)}>
      <span className={cn("size-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
