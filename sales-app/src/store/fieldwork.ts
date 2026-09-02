import { create } from "zustand";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { connectSocket, getSocket, isSocketConnected } from "@/lib/socket";
import {
  GeoError,
  GeoPoint,
  clearPositionWatch,
  friendlyGeoErrorMessage,
  getCurrentPosition,
  watchPosition,
} from "@/lib/geolocation";
import { getQueuedPings, queuePing, queuedPingCount, removeQueuedPing } from "@/lib/db";
import type { FieldWorkStatus, LocationPing } from "@/types";

interface FieldWorkState {
  status: FieldWorkStatus;
  fieldWorkStartAt: string | null;
  tracking: boolean;
  lastPoint: GeoPoint | null;
  todayDistanceKm: number;
  pendingCount: number;
  isOnline: boolean;
  geoErrorMessage: string | null;
  starting: boolean;
  ending: boolean;
  watchId: number;
  lastGeoErrorToastAt: number;
  init: () => void;
  syncStatusFromServer: (opts: { status: FieldWorkStatus; fieldWorkStartAt?: string | null; todayDistanceKm?: number | null }) => void;
  startFieldWork: () => Promise<void>;
  endFieldWork: () => Promise<void>;
  flushQueue: () => Promise<void>;
  clearGeoError: () => void;
}

let initialized = false;

function sendPing(payload: LocationPing) {
  const socket = getSocket();
  if (isSocketConnected() && socket) {
    socket.emit("location:update", payload);
    return Promise.resolve(true);
  }
  return api
    .post("/tracking/ping", payload)
    .then(() => true)
    .catch(() => false);
}

export const useFieldWorkStore = create<FieldWorkState>()((set, get) => ({
  status: "INACTIVE",
  fieldWorkStartAt: null,
  tracking: false,
  lastPoint: null,
  todayDistanceKm: 0,
  pendingCount: 0,
  isOnline: navigator.onLine,
  geoErrorMessage: null,
  starting: false,
  ending: false,
  watchId: -1,
  lastGeoErrorToastAt: 0,

  init: () => {
    if (initialized) return;
    initialized = true;

    window.addEventListener("online", () => {
      set({ isOnline: true });
      get().flushQueue();
    });
    window.addEventListener("offline", () => set({ isOnline: false }));

    const socket = connectSocket();
    socket.on("connect", () => {
      get().flushQueue();
    });

    // Periodically retry flushing in case 'online'/'connect' events are missed.
    setInterval(() => {
      if (navigator.onLine) get().flushQueue();
    }, 20000);

    queuedPingCount().then((n) => set({ pendingCount: n }));
  },

  syncStatusFromServer: ({ status, fieldWorkStartAt, todayDistanceKm }) => {
    set({
      status,
      fieldWorkStartAt: fieldWorkStartAt ?? null,
      ...(todayDistanceKm != null ? { todayDistanceKm } : {}),
    });
    // If server says field work is active but we're not tracking locally (e.g. app was
    // reopened mid-shift), resume the watch automatically.
    if (status === "ACTIVE" && !get().tracking) {
      get().startFieldWork().catch(() => {
        /* startFieldWork already surfaces errors via geoErrorMessage/toast */
      });
    }
  },

  startFieldWork: async () => {
    if (get().tracking || get().starting) return;
    set({ starting: true, geoErrorMessage: null });
    try {
      const point = await getCurrentPosition();
      await api.post("/tracking/field-work/start", { lat: point.lat, lng: point.lng });

      const watchId = watchPosition(
        (p) => {
          // A successful fix clears any previously surfaced error state (e.g. brief GPS blip recovered).
          if (get().geoErrorMessage) set({ geoErrorMessage: null });
          set({ lastPoint: p });
          sendPing({
            lat: p.lat,
            lng: p.lng,
            speed: p.speed,
            accuracy: p.accuracy,
            heading: p.heading,
            recordedAt: p.recordedAt,
          }).then((ok) => {
            if (!ok) {
              queuePing({
                lat: p.lat,
                lng: p.lng,
                speed: p.speed,
                accuracy: p.accuracy,
                heading: p.heading,
                recordedAt: p.recordedAt,
              }).then(() => queuedPingCount().then((n) => set({ pendingCount: n })));
            }
          });
        },
        (err) => {
          const message = friendlyGeoErrorMessage(err.kind);
          set({ geoErrorMessage: message });
          // Throttle error toasts to at most one per 15s while tracking — a transient GPS blip can
          // fire the watch's error callback many times a minute (and can even alternate between
          // error kinds), and toasting every time would spam the UI and block interaction. The
          // banner/card still reflects the persistent geoErrorMessage regardless of the throttle.
          const now = Date.now();
          if (now - get().lastGeoErrorToastAt > 15000) {
            set({ lastGeoErrorToastAt: now });
            toast.error(message);
          }
        }
      );

      set({
        tracking: true,
        status: "ACTIVE",
        fieldWorkStartAt: new Date().toISOString(),
        lastPoint: point,
        watchId,
        starting: false,
      });
      toast.success("Field work started. Location tracking is now active.");
    } catch (err) {
      set({ starting: false });
      if (err instanceof GeoError) {
        const message = friendlyGeoErrorMessage(err.kind);
        set({ geoErrorMessage: message });
        toast.error(message);
      } else {
        const message = err instanceof Error ? err.message : "Could not start field work";
        toast.error(message);
      }
      throw err;
    }
  },

  endFieldWork: async () => {
    if (get().ending) return;
    set({ ending: true });
    try {
      let point: GeoPoint | null = null;
      try {
        point = await getCurrentPosition();
      } catch (err) {
        // Still end field work server-side even if a final fix can't be obtained,
        // but tell the user honestly what happened.
        if (err instanceof GeoError) {
          toast.error(`${friendlyGeoErrorMessage(err.kind)} Ending field work without a final location.`);
        }
      }

      const { watchId } = get();
      if (watchId >= 0) clearPositionWatch(watchId);

      const fallback = get().lastPoint;
      const finalPoint = point ?? fallback;
      if (finalPoint) {
        await api.post("/tracking/field-work/end", { lat: finalPoint.lat, lng: finalPoint.lng });
      } else {
        // No location ever available — server still needs a lat/lng; surface a clear error.
        toast.error("No location available to end field work. Please try again with location enabled.");
        set({ ending: false });
        return;
      }

      set({
        tracking: false,
        status: "INACTIVE",
        fieldWorkStartAt: null,
        watchId: -1,
        ending: false,
      });
      toast.success("Field work ended. Tracking stopped.");
    } catch (err) {
      set({ ending: false });
      const message = err instanceof Error ? err.message : "Could not end field work";
      toast.error(message);
      throw err;
    }
  },

  flushQueue: async () => {
    const pings = await getQueuedPings();
    if (pings.length === 0) return;
    for (const p of pings) {
      try {
        await api.post("/tracking/ping", {
          lat: p.lat,
          lng: p.lng,
          speed: p.speed,
          accuracy: p.accuracy,
          heading: p.heading,
          recordedAt: p.recordedAt,
        });
        if (p.id != null) await removeQueuedPing(p.id);
      } catch {
        // stop on first failure — preserve chronological order for the next attempt
        break;
      }
    }
    const n = await queuedPingCount();
    set({ pendingCount: n });
  },

  clearGeoError: () => set({ geoErrorMessage: null }),
}));
