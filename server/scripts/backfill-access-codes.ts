// One-time migration helper: the access-code login feature was added additively (see
// prisma/migrations/20260904071500_add_salesperson_access_code), so any salesperson created
// before that migration has no accessCode yet and can't sign in to the sales app until one
// exists. Run this once after deploying the migration: `npx tsx scripts/backfill-access-codes.ts`.
// Safe to re-run - it only touches rows where accessCode IS NULL.
import { prisma } from "../src/lib/prisma";
import { generateUniqueAccessCode } from "../src/lib/accessCode";

async function main() {
  const sps = await prisma.salesperson.findMany({
    where: { accessCode: null },
    include: { user: { select: { name: true } } },
  });
  for (const sp of sps) {
    const accessCode = await generateUniqueAccessCode();
    await prisma.salesperson.update({ where: { id: sp.id }, data: { accessCode } });
    console.log(`${sp.employeeCode} (${sp.user.name}) -> ${accessCode}`);
  }
  console.log(`Backfilled ${sps.length} access codes.`);
}

main().finally(() => prisma.$disconnect());
