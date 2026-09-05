import { prisma } from "./prisma";
import type { TokenPayload } from "./auth";

/**
 * Resolves which salesperson a newly created record (visit, order, quotation, collection,
 * lead, follow-up...) belongs to. A SALESPERSON always owns their own record; an ADMIN has to
 * name one, and it must be one of their own tenant's.
 *
 * Every one of those models has a *required* salesperson relation, so this can never return
 * undefined. Each route used to inline the same two lines:
 *
 *     const salespersonId = role === "SALESPERSON" ? auth.salespersonId! : req.body.salespersonId;
 *     const owner = await prisma.salesperson.findFirst({ where: { id: salespersonId, tenantId } });
 *
 * which had two holes. If an admin omitted the id, `where: { id: undefined }` is not "match
 * nothing" in Prisma - it means "don't filter on id at all", so the lookup matched an
 * arbitrary salesperson, passed the ownership check, and the create then failed with an
 * unhandled PrismaClientValidationError (HTTP 500). And a route that skipped the check
 * entirely accepted another tenant's salesperson id outright.
 *
 * Throws a 400-tagged error (the status convention already used across these routes) so the
 * caller gets a clear message instead of a 500.
 */
export async function resolveOwningSalespersonId(auth: TokenPayload, requestedId: unknown): Promise<string> {
  if (auth.role === "SALESPERSON") return auth.salespersonId!;

  const id = typeof requestedId === "string" && requestedId.trim() ? requestedId.trim() : null;
  if (!id) throw Object.assign(new Error("Select a salesperson to assign this to"), { status: 400 });

  const owner = await prisma.salesperson.findFirst({ where: { id, tenantId: auth.tenantId }, select: { id: true } });
  if (!owner) throw Object.assign(new Error("Salesperson not found"), { status: 400 });
  return id;
}
