import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("sf_token");
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(process.env.NEXT_PUBLIC_API_URL, {
    auth: { token },
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
  s.on(event, handler as any);
  return () => {
    s.off(event, handler as any);
  };
}
