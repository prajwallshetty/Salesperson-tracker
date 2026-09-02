import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getIO } from "../sockets/io";

export async function notifyAdmins(
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type,
      title,
      message,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    })),
  });
  try {
    getIO().to("admins").emit("notification:new", {
      type,
      title,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // socket not ready yet, ignore
  }
}

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  await prisma.notification.create({
    data: { userId, type, title, message, metadata: metadata as Prisma.InputJsonValue | undefined },
  });
  try {
    getIO().to(`user:${userId}`).emit("notification:new", {
      type,
      title,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // socket not ready yet, ignore
  }
}
