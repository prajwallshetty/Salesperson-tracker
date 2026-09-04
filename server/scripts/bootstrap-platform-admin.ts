// One-time bootstrap for the very first PlatformAdmin (SalesGrid's own staff account, not a
// tenant user - see prisma/schema.prisma's PlatformAdmin model). Run once:
//   npx tsx scripts/bootstrap-platform-admin.ts <email> [name]
// Generates a random password and prints it ONCE - it is not stored anywhere in plaintext.
// Change it after first login. Safe to re-run with a different email to add another admin;
// re-running with an existing email exits without modifying that account.
import crypto from "crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const email = process.argv[2];
  const name = process.argv[3] || "Platform Admin";
  if (!email) {
    console.error("Usage: npx tsx scripts/bootstrap-platform-admin.ts <email> [name]");
    process.exit(1);
  }

  const existing = await prisma.platformAdmin.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`PlatformAdmin ${email} already exists (id ${existing.id}). Nothing changed.`);
    return;
  }

  const password = crypto.randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);
  const admin = await prisma.platformAdmin.create({ data: { email: email.toLowerCase(), name, passwordHash } });

  console.log(`Created PlatformAdmin ${admin.email} (id ${admin.id}).`);
  console.log(`Temporary password: ${password}`);
  console.log("Log in at POST /api/platform/login and change this password immediately - it will not be shown again.");
}

main().finally(() => prisma.$disconnect());
