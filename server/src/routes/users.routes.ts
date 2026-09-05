import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { parseEnumQuery } from "../utils/enumQuery";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/auth";
import { createSalespersonAccount } from "../services/accounts";
import { SAFE_USER_SELECT } from "../lib/selects";
import { generateUniqueAccessCode } from "../lib/accessCode";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { role, isActive, accessCodeStatus, search, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (role) where.role = parseEnumQuery(role, Role, "role");
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (accessCodeStatus) {
      if (accessCodeStatus === "ENABLED") {
        where.salesperson = { accessCodeEnabled: true, accessCode: { not: null } };
      } else if (accessCodeStatus === "DISABLED") {
        where.salesperson = { accessCodeEnabled: false };
      } else if (accessCodeStatus === "NONE") {
        where.salesperson = { accessCode: null };
      }
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
          salesperson: {
            select: {
              id: true,
              employeeCode: true,
              status: true,
              accessCodeEnabled: true,
              accessCodeLastUsedAt: true,
              territory: { select: { id: true, name: true } },
            },
          },
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
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        salesperson: {
          include: { territory: true },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  })
);

const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "SALESPERSON"]),
    employeeCode: z.string().optional(),
    territoryId: z.string().optional().nullable(),
    managerId: z.string().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "ADMIN" && (!v.password || v.password.length < 6)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password (min 6 chars) is required for ADMIN role" });
    }
  });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const data = createUserSchema.parse(req.body);

    if (data.role === "SALESPERSON") {
      if (!data.employeeCode) {
        return res.status(400).json({ error: "employeeCode is required when role is SALESPERSON" });
      }
      const salesperson = await createSalespersonAccount(tenantId, {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        employeeCode: data.employeeCode,
        territoryId: data.territoryId,
        managerId: data.managerId,
      });
      res.locals.allowAccessCode = true;
      return res.status(201).json({
        ...salesperson.user,
        salesperson: {
          id: salesperson.id,
          employeeCode: salesperson.employeeCode,
          status: salesperson.status,
          accessCode: salesperson.accessCode,
          accessCodeEnabled: salesperson.accessCodeEnabled,
          accessCodeLastUsedAt: salesperson.accessCodeLastUsedAt,
          territory: salesperson.territory,
        },
      });
    }

    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const passwordHash = await hashPassword(data.password!);
    const user = await prisma.user.create({
      data: { tenantId, name: data.name, email, passwordHash, phone: data.phone, role: "ADMIN" },
      select: SAFE_USER_SELECT,
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
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      include: { salesperson: true },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (data.role && data.role !== existing.role) {
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
      select: SAFE_USER_SELECT,
    });
    res.json(user);
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "SALESPERSON") {
      return res.status(400).json({ error: "Salespersons authenticate via Access Code, not password." });
    }
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

// Access Code Endpoints for Users
router.get(
  "/:id/access-code",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { salesperson: true },
    });
    if (!user || !user.salesperson) return res.status(404).json({ error: "Salesperson account not found" });

    let sp = user.salesperson;
    if (!sp.accessCode) {
      const code = await generateUniqueAccessCode();
      sp = await prisma.salesperson.update({
        where: { id: sp.id },
        data: { accessCode: code, accessCodeEnabled: true },
      });
    }

    res.locals.allowAccessCode = true;
    res.json({
      salespersonId: sp.id,
      accessCode: sp.accessCode,
      accessCodeEnabled: sp.accessCodeEnabled,
      accessCodeLastUsedAt: sp.accessCodeLastUsedAt,
    });
  })
);

router.post(
  "/:id/access-code/regenerate",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { salesperson: true },
    });
    if (!user || !user.salesperson) return res.status(404).json({ error: "Salesperson account not found" });

    const code = await generateUniqueAccessCode();
    const sp = await prisma.salesperson.update({
      where: { id: user.salesperson.id },
      data: { accessCode: code, accessCodeEnabled: true, accessCodeLastUsedAt: null },
    });

    res.locals.allowAccessCode = true;
    res.json({
      salespersonId: sp.id,
      accessCode: sp.accessCode,
      accessCodeEnabled: sp.accessCodeEnabled,
      accessCodeLastUsedAt: sp.accessCodeLastUsedAt,
    });
  })
);

router.patch(
  "/:id/access-code",
  asyncHandler(async (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { salesperson: true },
    });
    if (!user || !user.salesperson) return res.status(404).json({ error: "Salesperson account not found" });

    let sp = user.salesperson;
    if (!sp.accessCode) {
      const code = await generateUniqueAccessCode();
      sp = await prisma.salesperson.update({
        where: { id: sp.id },
        data: { accessCode: code, accessCodeEnabled: enabled },
      });
    } else {
      sp = await prisma.salesperson.update({
        where: { id: sp.id },
        data: { accessCodeEnabled: enabled },
      });
    }

    res.locals.allowAccessCode = true;
    res.json({
      salespersonId: sp.id,
      accessCode: sp.accessCode,
      accessCodeEnabled: sp.accessCodeEnabled,
      accessCodeLastUsedAt: sp.accessCodeLastUsedAt,
    });
  })
);

export default router;

