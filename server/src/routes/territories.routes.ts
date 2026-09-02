import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const territories = await prisma.territory.findMany({
      include: { _count: { select: { salespersons: true, customers: true } } },
      orderBy: { name: "asc" },
    });
    res.json(territories);
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, description } = z.object({ name: z.string().min(1), description: z.string().optional() }).parse(req.body);
    const territory = await prisma.territory.create({ data: { name, description } });
    res.status(201).json(territory);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, description } = z
      .object({ name: z.string().min(1).optional(), description: z.string().optional() })
      .parse(req.body);
    const territory = await prisma.territory.update({ where: { id: req.params.id }, data: { name, description } });
    res.json(territory);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.territory.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
