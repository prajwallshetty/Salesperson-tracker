import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export type ConnectionStatus = "connected" | "connecting" | "disconnected";
let connectionStatus: ConnectionStatus = "connecting";
const statusListeners = new Set<() => void>();

function setStatus(next: ConnectionStatus) {
  if (connectionStatus === next) return;
  connectionStatus = next;
  statusListeners.forEach((fn) => fn());
}

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

/** Subscribe to connection status changes (used by useSyncExternalStore in the
 * Live/Reconnecting/Offline badge - the callback takes no args by design, matching
 * useSyncExternalStore's subscribe signature; read the current value via
 * getConnectionStatus() instead of trusting an argument, which is what makes this safe
 * against the "missed update between initial render and subscribing" race a plain
 * useState+useEffect subscription would have. */
export function subscribeConnectionStatus(fn: () => void) {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
}

// Auth is cookie-based now (see API_CONTRACT.md "Real-time (Socket.IO)") - the server
// parses the httpOnly `sf_token` cookie directly off the handshake's raw Cookie header,
// so the client just needs `withCredentials: true` (same flag as the axios instance) and
// nothing else. There is no `auth: { token }` handshake option to pass anymore.
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  // Reuse the existing instance whenever one exists, connected or not - socket.io-client
  // already handles the connecting/reconnecting lifecycle on a single Socket object.
  // Tearing down and recreating the socket just because it "wasn't connected yet" (which
  // includes the normal brief in-flight window on every fresh connection) would kill a
  // perfectly healthy in-progress handshake every time a second component's effect calls
  // subscribe() moments after the first (e.g. NotificationBell + LiveTrackingView both do,
  // on mount). Only build a new Socket when none exists at all (first call, or after an
  // explicit disconnectSocket() on logout).
  if (socket) return socket;
  setStatus("connecting");
  socket = io(process.env.NEXT_PUBLIC_API_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    // socket.io-client reconnects automatically by default (not disabled here) - these
    // options just make the retry cadence sensible for a dashboard left open all day.
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  socket.on("connect", () => setStatus("connected"));
  socket.on("disconnect", () => setStatus("disconnected"));
  socket.on("reconnect_attempt", () => setStatus("connecting"));
  socket.on("connect_error", () => setStatus("disconnected"));
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribe<T = unknown>(event: string, handler: (payload: T) => void) {
  const s = getSocket();
  if (!s) return () => {};
  const listener = handler as unknown as (...args: unknown[]) => void;
  s.on(event, listener);
  return () => {
    s.off(event, listener);
  };
}
