import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

export interface CreateSalespersonAccountInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  employeeCode: string;
  territoryId?: string | null;
  managerId?: string | null;
}

/**
 * Creates a User (role SALESPERSON) plus its linked Salesperson record. Shared by
 * POST /api/salespersons (the original salesperson-creation endpoint) and
 * POST /api/users (admin user management, when role === "SALESPERSON") so the two never drift.
 * Throws (with an http `status`) if the email is already taken.
 */
export async function createSalespersonAccount(input: CreateSalespersonAccountInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error("Email already in use"), { status: 409 });

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      phone: input.phone,
      role: "SALESPERSON",
    },
  });
  const salesperson = await prisma.salesperson.create({
    data: {
      userId: user.id,
      employeeCode: input.employeeCode,
      territoryId: input.territoryId || null,
      managerId: input.managerId || null,
    },
    include: { user: true, territory: true },
  });
  return salesperson;
}
