import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // Cookie-based auth (see API_CONTRACT.md "Real-time (Socket.IO)"): the server parses the
  // `sf_token` cookie directly off the raw Cookie header on the handshake. `withCredentials: true`
  // is what makes the browser attach that cookie to the (cross-origin, :5174 -> :4000) handshake —
  // there is no `auth: { token }` option to pass anymore.
  socket = io(process.env.NEXT_PUBLIC_API_URL, {
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return !!socket?.connected;
}
