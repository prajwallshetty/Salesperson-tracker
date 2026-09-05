import { prisma } from "../lib/prisma";
import { AuditActorType, Prisma } from "@prisma/client";

/**
 * Append-only log of billing-affecting actions (see BillingAuditLog in schema.prisma) - never
 * updated or deleted, used for support/dispute investigation ("why did this tenant's plan
 * change on this date"). Every place that changes a Subscription row should call this in the
 * same request, not just services/razorpayWebhook.ts.
 */
export async function recordBillingAudit(input: {
  /** Omit for a platform-wide action with no single owning tenant (e.g. PLAN_CREATED). */
  tenantId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  action: string;
  previousState?: unknown;
  newState?: unknown;
  providerEventId?: string | null;
}) {
  await prisma.billingAuditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      previousState: input.previousState as Prisma.InputJsonValue | undefined,
      newState: input.newState as Prisma.InputJsonValue | undefined,
      providerEventId: input.providerEventId ?? null,
    },
  });
}
