import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({ where: { userId: req.auth!.userId, isRead: false } }),
    ]);
    res.json({ items: notifications, unreadCount });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const existing = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.auth!.userId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(notification);
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.auth!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  })
);

export default router;
