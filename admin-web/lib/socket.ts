import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export type ConnectionStatus = "connected" | "connecting" | "disconnected";
let connectionStatus: ConnectionStatus = "connecting";
const statusListeners = new Set<(status: ConnectionStatus) => void>();

function setStatus(next: ConnectionStatus) {
  if (connectionStatus === next) return;
  connectionStatus = next;
  statusListeners.forEach((fn) => fn(next));
}

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

/** Subscribe to connection status changes (used by the Live/Reconnecting/Offline badge). */
export function subscribeConnectionStatus(fn: (status: ConnectionStatus) => void) {
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
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
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
