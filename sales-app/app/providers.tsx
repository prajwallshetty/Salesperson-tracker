"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
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
  const token = useAuthStore((s) => s.token);
  const hydrateFromMe = useAuthStore((s) => s.hydrateFromMe);
  const init = useFieldWorkStore((s) => s.init);
  const syncStatusFromServer = useFieldWorkStore((s) => s.syncStatusFromServer);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (token) hydrateFromMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Pull the salesperson's current field-work status/today distance once authenticated,
  // so the tracking store (and its resume-on-reload logic) reflect server truth.
  useEffect(() => {
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
  }, [token, syncStatusFromServer]);

  // Global toast on incoming real-time notifications targeted at this user.
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket();
    const handler = (n: AppNotification) => {
      toast(n.title || n.message, { icon: "🔔" });
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [token]);

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      {children}
    </>
  );
}
