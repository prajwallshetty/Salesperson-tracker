"use client";

import { useEffect, useState } from "react";
import { getConnectionStatus, subscribeConnectionStatus, type ConnectionStatus as Status } from "@/lib/socket";
import { cn } from "@/lib/utils";

const META: Record<Status, { label: string; dot: string; text: string }> = {
  connected: { label: "Live", dot: "bg-success", text: "text-success" },
  connecting: { label: "Reconnecting", dot: "bg-warning animate-pulse", text: "text-warning" },
  disconnected: { label: "Offline", dot: "bg-danger", text: "text-danger" },
};

/** Small realtime-connection indicator - Live / Reconnecting / Offline - for pages that
 * depend on the Socket.IO location feed, so a stalled connection is visible rather than
 * silently leaving stale markers on screen. */
export function ConnectionStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>(getConnectionStatus());

  useEffect(() => subscribeConnectionStatus(setStatus), []);

  const meta = META[status];
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", meta.text, className)}>
      <span className={cn("size-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
