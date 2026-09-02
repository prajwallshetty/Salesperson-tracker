"use client";

import { useEffect, useState } from "react";
import { useFieldWorkStore } from "@/store/fieldwork";

export function OfflineBanner() {
  // Guard: this component is prerendered to HTML once on the server before hydration,
  // where `navigator` does not exist.
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const pendingCount = useFieldWorkStore((s) => s.pendingCount);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={
        "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold text-white " +
        (online ? "bg-amber-500" : "bg-slate-700")
      }
    >
      {!online && <span>You&apos;re offline. Location pings are being saved and will sync automatically.</span>}
      {online && pendingCount > 0 && <span>Syncing {pendingCount} saved location point{pendingCount === 1 ? "" : "s"}…</span>}
    </div>
  );
}
