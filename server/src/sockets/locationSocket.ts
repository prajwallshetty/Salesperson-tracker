import { Server, Socket } from "socket.io";
import { verifyToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { recordLocationPing } from "../routes/tracking.routes";

const disconnectTimers = new Map<string, NodeJS.Timeout>();

interface SocketData {
  userId: string;
  role: "ADMIN" | "SALESPERSON";
  salespersonId?: string;
}

export function registerLocationSocket(io: Server) {
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing auth token"));
      const payload = verifyToken(token);
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
