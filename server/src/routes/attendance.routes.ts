import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { startOfDay, endOfDay } from "../utils/dates";

const router = Router();
router.use(requireAuth);

// Admin-wide attendance listing. Admins can see and filter everyone; a salesperson who manages
// reports (Salesperson.managerId points at them) can see their own attendance plus their
// reports' - there's no separate "manager" Role, a manager is just a salesperson with reports.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      salespersonId,
      date,
      dateFrom,
      dateTo,
      status,
      page = "1",
      pageSize = "50",
    } = req.query as Record<string, string>;

    const where: any = {};

    if (req.auth!.role === "SALESPERSON") {
      const reports = await prisma.salesperson.findMany({
        where: { managerId: req.auth!.salespersonId },
        select: { id: true },
      });
      const allowedIds = [req.auth!.salespersonId!, ...reports.map((r) => r.id)];
      if (salespersonId) {
        if (!allowedIds.includes(salespersonId)) return res.status(403).json({ error: "Forbidden" });
        where.salespersonId = salespersonId;
      } else {
        where.salespersonId = { in: allowedIds };
      }
    } else if (salespersonId) {
      where.salespersonId = salespersonId;
    }

    if (date) {
      const d = new Date(date);
      where.date = { gte: startOfDay(d), lte: endOfDay(d) };
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = startOfDay(new Date(dateFrom));
      if (dateTo) where.date.lte = endOfDay(new Date(dateTo));
    }

    // status is derived (not a DB column): PRESENT = checked in and out, INCOMPLETE = checked in
    // only, ABSENT = never checked in. Expressed as a where-clause (not a post-filter) so
    // pagination/total stay correct.
    if (status === "PRESENT") {
      where.checkInAt = { not: null };
      where.checkOutAt = { not: null };
    } else if (status === "INCOMPLETE") {
      where.checkInAt = { not: null };
      where.checkOutAt = null;
    } else if (status === "ABSENT") {
      where.checkInAt = null;
    }

    const take = Math.min(parseInt(pageSize, 10) || 50, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [rows, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { salesperson: { include: { user: { select: { name: true, avatarUrl: true } } } } },
        orderBy: { date: "desc" },
        take,
        skip,
      }),
      prisma.attendance.count({ where }),
    ]);

    const items = rows.map((a) => ({
      id: a.id,
      salespersonId: a.salespersonId,
      salespersonName: a.salesperson.user.name,
      avatarUrl: a.salesperson.user.avatarUrl,
      date: a.date,
      checkInAt: a.checkInAt,
      checkOutAt: a.checkOutAt,
      checkInLat: a.checkInLat,
      checkInLng: a.checkInLng,
      checkOutLat: a.checkOutLat,
      checkOutLng: a.checkOutLng,
      totalDistanceKm: a.totalDistanceKm,
      totalDurationMin: a.totalDurationMin,
      status: a.checkInAt && a.checkOutAt ? "PRESENT" : a.checkInAt ? "INCOMPLETE" : "ABSENT",
    }));

    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

export default router;
