import { SubscriptionStatus } from "@prisma/client";

/**
 * Centralized Razorpay-status -> Sales Grid-status mapping (task requirement: "Do not expose
 * raw provider status throughout the application"). Nothing outside this file and
 * services/razorpayWebhook.ts should ever read a raw Razorpay subscription/payment status
 * string - every other part of the app (entitlement checks, the billing UI, platform admin)
 * reads Subscription.status, one of Sales Grid's own six states.
 *
 * Razorpay subscription statuses (per their Subscriptions API): created, authenticated, active,
 * pending, halted, cancelled, completed, expired. Mapped here; anything unrecognized maps to
 * PAST_DUE rather than silently defaulting to ACTIVE, since granting access on an unknown status
 * is the wrong failure direction for a billing check.
 */
export function mapRazorpaySubscriptionStatus(razorpayStatus: string): SubscriptionStatus {
  switch (razorpayStatus) {
    case "created":
    case "authenticated":
      // Subscription exists but the customer hasn't completed checkout/authorization yet -
      // treated the same as an ordinary trial until a `subscription.activated`/`.charged` event
      // moves it to ACTIVE.
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "pending":
      // A charge attempt failed but Razorpay is still retrying per its retry schedule - the
      // tenant needs to update their payment method soon, but isn't fully cut off yet.
      return "PAST_DUE";
    case "halted":
      // Razorpay gave up retrying a failed charge - functionally suspended until the tenant
      // takes action (update payment method / manual intervention).
      return "SUSPENDED";
    case "cancelled":
      return "CANCELLED";
    case "completed":
    case "expired":
      return "EXPIRED";
    default:
      return "PAST_DUE";
  }
}

export function mapRazorpayPaymentEventToStatus(eventType: string): SubscriptionStatus | null {
  switch (eventType) {
    case "payment.captured":
    case "subscription.charged":
    case "subscription.activated":
      return "ACTIVE";
    case "payment.failed":
      return "PAST_DUE";
    case "subscription.pending":
      return "PAST_DUE";
    case "subscription.halted":
      return "SUSPENDED";
    case "subscription.cancelled":
      return "CANCELLED";
    case "subscription.completed":
      return "EXPIRED";
    default:
      return null;
  }
}
