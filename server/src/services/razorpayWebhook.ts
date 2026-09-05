import { prisma } from "../lib/prisma";
import { verifyHmacSignature } from "../lib/razorpay";
import { mapRazorpayPaymentEventToStatus } from "../lib/subscriptionStatusMap";
import { Prisma } from "@prisma/client";

export class InvalidWebhookSignatureError extends Error {
  status = 400;
  constructor() {
    super("Invalid webhook signature");
    this.name = "InvalidWebhookSignatureError";
  }
}

interface RazorpayWebhookPayload {
  event: string;
  created_at: number;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: { id: string; order_id?: string; notes?: Record<string, string> } };
  };
}

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  notes?: Record<string, string>;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
}

function unixToDate(ts: number | null | undefined): Date | undefined {
  return typeof ts === "number" ? new Date(ts * 1000) : undefined;
}

/**
 * Verifies a Razorpay webhook's signature against the RAW request body (not the parsed JSON -
 * re-serializing a parsed body can produce different bytes than what Razorpay actually signed,
 * e.g. key ordering or number formatting, which would make a genuine webhook fail verification).
 * See routes/billing.routes.ts for where this raw body is captured before express.json() runs.
 */
export function verifyRazorpayWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  return verifyHmacSignature(rawBody.toString("utf8"), signatureHeader, secret);
}

/**
 * Idempotency key for a webhook delivery. Prefers Razorpay's `x-razorpay-event-id` header when
 * present (added to their webhook deliveries in recent API versions); falls back to a
 * deterministic key built from the event type + the relevant entity id + the event's own
 * `created_at`, since retried deliveries of the *same* event carry the same values for all three
 * - verify this fallback is still needed against the current Razorpay docs/dashboard payload
 * before relying on it long-term, since a header-based id is more robust if Razorpay's account
 * settings expose one.
 */
function resolveEventId(headerEventId: string | undefined, payload: RazorpayWebhookPayload): string {
  if (headerEventId) return headerEventId;
  const entityId = payload.payload.subscription?.entity.id ?? payload.payload.payment?.entity.id ?? "unknown";
  return `${payload.event}:${entityId}:${payload.created_at}`;
}

/**
 * Processes one verified Razorpay webhook delivery. Idempotent: if `eventId` was already
 * recorded, this returns immediately without touching the Subscription row again, so Razorpay
 * retrying a delivery (network blip, our server returning non-2xx) can never double-apply an
 * update, create a duplicate record, or double-count a payment.
 *
 * Must be called only after verifyRazorpayWebhookSignature has returned true for this request.
 */
export async function processRazorpayWebhook(rawBody: Buffer, headerEventId: string | undefined) {
  const payload = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
  const eventId = resolveEventId(headerEventId, payload);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.billingEvent.findUnique({ where: { eventId } });
    if (existing?.processed) {
      return { alreadyProcessed: true as const };
    }

    const event =
      existing ??
      (await tx.billingEvent.create({
        data: {
          eventId,
          eventType: payload.event,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      }));

    const subscriptionEntity = payload.payload.subscription?.entity;
    const tenantId = subscriptionEntity?.notes?.tenantId ?? payload.payload.payment?.entity.notes?.tenantId;
    const mappedStatus = mapRazorpayPaymentEventToStatus(payload.event);

    // Not every event we might receive carries a tenantId we recognize (e.g. a webhook for a
    // subscription this instance didn't create, or one whose notes were somehow stripped) - log
    // it as processed so it's not retried forever, but there's nothing to apply.
    if (tenantId && mappedStatus) {
      const subscription = await tx.subscription.findUnique({ where: { tenantId } });
      if (subscription) {
        const previousState = { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd };
        await tx.subscription.update({
          where: { tenantId },
          data: {
            status: mappedStatus,
            billingProvider: "razorpay",
            providerSubscriptionId: subscriptionEntity?.id ?? subscription.providerSubscriptionId,
            currentPeriodStart: unixToDate(subscriptionEntity?.current_start) ?? subscription.currentPeriodStart,
            currentPeriodEnd: unixToDate(subscriptionEntity?.current_end) ?? subscription.currentPeriodEnd,
            endedAt: unixToDate(subscriptionEntity?.ended_at) ?? subscription.endedAt,
          },
        });
        await tx.billingAuditLog.create({
          data: {
            tenantId,
            actorType: "SYSTEM",
            action: `WEBHOOK_${payload.event.toUpperCase().replace(/\./g, "_")}`,
            previousState: previousState as Prisma.InputJsonValue,
            newState: { status: mappedStatus } as Prisma.InputJsonValue,
            providerEventId: eventId,
          },
        });
      }
    }

    await tx.billingEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });

    return { alreadyProcessed: false as const, tenantId, mappedStatus };
  });

  return result;
}
