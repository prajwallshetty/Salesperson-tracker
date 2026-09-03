"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster, toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useFieldWorkStore } from "@/store/fieldwork";
import { connectSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types";

// Mounted once from app/layout.tsx, which stays mounted across every client-side
// navigation in the App Router — the direct equivalent of the old src/App.tsx
// mounting above <BrowserRouter>. This is what keeps navigator.geolocation.watchPosition
// (started inside the field-work store) running continuously regardless of which
// page the salesperson navigates to. Do NOT move this init() call into a per-page
// component — that would remount on every navigation and interrupt GPS tracking.
export function Providers({ children }: { children: React.ReactNode }) {
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const checkSession = useAuthStore((s) => s.checkSession);
  const init = useFieldWorkStore((s) => s.init);
  const syncStatusFromServer = useFieldWorkStore((s) => s.syncStatusFromServer);

  useEffect(() => {
    init();
  }, [init]);

  // Cookie-based auth: there's no locally-cached token to read, so every load must ask the
  // server whether the sf_token cookie (if any) is still valid. This runs unconditionally and
  // exactly once per app load, from the top-level Providers (mounted for every route, including
  // /login) — see store/auth.ts's sessionStatus docs for why routing must wait on this instead of
  // any cached boolean.
  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull the salesperson's current field-work status/today distance once authenticated,
  // so the tracking store (and its resume-on-reload logic) reflect server truth.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const user = useAuthStore.getState().user;
    if (!user?.salespersonId) return;
    api
      .get(`/salespersons/${user.salespersonId}`)
      .then((res) => {
        const sp = res.data;
        syncStatusFromServer({
          status: sp.fieldWorkStatus,
          fieldWorkStartAt: sp.fieldWorkStartAt,
          todayDistanceKm: sp.todayDistanceKm,
        });
      })
      .catch(() => {
        /* non-fatal — home screen will still work off local state */
      });
  }, [sessionStatus, syncStatusFromServer]);

  // Global toast on incoming real-time notifications targeted at this user.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const socket = connectSocket();
    const handler = (n: AppNotification) => {
      toast(n.title || n.message, { icon: "🔔" });
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [sessionStatus]);

  return (
    // reducedMotion="user" makes every Framer Motion element in the app defer to the OS-level
    // "reduce motion" accessibility setting automatically (transforms/scale/slide are skipped,
    // opacity fades still play) — no per-component prefers-reduced-motion checks needed.
    <MotionConfig reducedMotion="user">
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          duration: 3500,
          classNames: {
            toast: "rounded-2xl border border-border/60 shadow-popover font-sans text-sm",
            title: "font-semibold",
          },
        }}
      />
      {children}
    </MotionConfig>
  );
}
