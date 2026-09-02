import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppRouter } from "./router";
import { useAuthStore } from "@/store/auth";
import { useFieldWorkStore } from "@/store/fieldwork";
import { connectSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types";
import toast from "react-hot-toast";

export default function App() {
  const { token, hydrateFromMe } = useAuthStore();
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
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <AppRouter />
    </BrowserRouter>
  );
}
