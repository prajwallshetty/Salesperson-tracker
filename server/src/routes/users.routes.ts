import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/auth";
import { createSalespersonAccount } from "../services/accounts";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { role, isActive, search, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const take = Math.min(parseInt(pageSize, 10) || 20, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          salesperson: { select: { id: true, employeeCode: true, status: true, territory: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        salesperson: { include: { territory: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  })
);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "SALESPERSON"]),
  // required when role === "SALESPERSON" (validated below) - reuses the same
  // create-salesperson-account flow as POST /api/salespersons so a SALESPERSON user always gets
  // its linked Salesperson row created the same way.
  employeeCode: z.string().optional(),
  territoryId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);

    if (data.role === "SALESPERSON") {
      if (!data.employeeCode) {
        return res.status(400).json({ error: "employeeCode is required when role is SALESPERSON" });
      }
      const salesperson = await createSalespersonAccount({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        employeeCode: data.employeeCode,
        territoryId: data.territoryId,
        managerId: data.managerId,
      });
      return res.status(201).json(salesperson.user);
    }

    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { name: data.name, email, passwordHash, phone: data.phone, role: "ADMIN" },
    });
    res.status(201).json(user);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "SALESPERSON"]).optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.params.id }, include: { salesperson: true } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (data.role && data.role !== existing.role) {
      // Switching SALESPERSON -> ADMIN or vice versa is a structural change (a Salesperson row
      // is tied 1:1 to a User and has its own FKs from visits/orders/etc.), so it isn't safe to
      // do implicitly here. Reject rather than silently leaving an inconsistent linkage - an
      // admin who genuinely needs this should deactivate the old account and create a new one
      // with POST /api/users.
      if (data.role === "ADMIN" && existing.salesperson) {
        return res.status(409).json({
          error: "Cannot change role to ADMIN: user has a linked Salesperson record. Deactivate and create a new account instead.",
        });
      }
      if (data.role === "SALESPERSON" && !existing.salesperson) {
        return res.status(409).json({
          error: "Cannot change role to SALESPERSON here: use POST /api/users with role SALESPERSON to create the linked Salesperson record.",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name: data.name, phone: data.phone, isActive: data.isActive, role: data.role },
    });
    res.json(user);
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

export default router;
