import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

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
  socket = io(process.env.NEXT_PUBLIC_API_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
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
