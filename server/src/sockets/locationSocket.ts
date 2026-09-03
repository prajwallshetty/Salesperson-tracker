import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { verifyToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { recordLocationPing } from "../routes/tracking.routes";
import { AUTH_COOKIE_NAME } from "../middleware/auth";

const disconnectTimers = new Map<string, NodeJS.Timeout>();

interface SocketData {
  userId: string;
  role: "ADMIN" | "SALESPERSON";
  salespersonId?: string;
}

// Sockets don't go through Express's middleware chain, so cookie-parser (mounted on `app`) never
// sees the handshake - we parse the raw `Cookie` header ourselves here. socket.io-client sends
// cookies on the handshake automatically as long as the client is created with
// `withCredentials: true` (same mechanism as fetch/axios `credentials: "include"`); the server's
// CORS config already has `credentials: true` for both the Express app and the Socket.IO server,
// so no other server-side change is needed for that to work.
//
// `auth.token` (the pre-cookie handshake shape) is still accepted first for backward
// compatibility with any client not yet updated - the next two frontend agents should switch to
// `withCredentials: true` and can then drop the `auth: { token }` handshake option entirely.
function extractToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;
  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) return undefined;
  const parsed = cookie.parse(rawCookie);
  return parsed[AUTH_COOKIE_NAME];
}

export function registerLocationSocket(io: Server) {
  io.use(async (socket: Socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) return next(new Error("Missing auth token"));
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isActive: true } });
      if (!user || !user.isActive) return next(new Error("Account is deactivated"));
      (socket.data as SocketData) = {
        userId: payload.userId,
        role: payload.role,
        salespersonId: payload.salespersonId,
      };
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.join(`user:${data.userId}`);

    if (data.role === "ADMIN") {
      socket.join("admins");
    }

    if (data.role === "SALESPERSON" && data.salespersonId) {
      const existingTimer = disconnectTimers.get(data.salespersonId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        disconnectTimers.delete(data.salespersonId);
      }

      socket.on("location:update", async (payload) => {
        try {
          await recordLocationPing(data.salespersonId!, payload);
        } catch (err) {
          socket.emit("location:error", { message: (err as Error).message });
        }
      });

      socket.on("disconnect", () => {
        const timer = setTimeout(async () => {
          try {
            const sp = await prisma.salesperson.update({
              where: { id: data.salespersonId },
              data: { isOnline: false },
            });
            io.to("admins").emit("salesperson:status", {
              salespersonId: data.salespersonId,
              isOnline: false,
              fieldWorkStatus: sp.fieldWorkStatus,
            });
          } catch {
            /* salesperson may have been deleted */
          }
          disconnectTimers.delete(data.salespersonId!);
        }, 20000);
        disconnectTimers.set(data.salespersonId!, timer);
      });
    }
  });
}
