import { prisma } from "../lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Provider-agnostic billing abstraction. No real payment processor is wired in yet (this
 * environment has no live Razorpay/Stripe credentials) - `ManualBillingProvider` below is the
 * only implementation, and every tenant's subscription today has `billingProvider: "manual"`,
 * changed only by a platform admin (see PATCH /api/platform/tenants/:id/subscription).
 *
 * Adding a real provider means implementing this interface (e.g. `RazorpayBillingProvider`) and
 * having its webhook handler call `applySubscriptionUpdate` - nothing else in the codebase reads
 * `billingProvider`/`providerCustomerId`/`providerSubscriptionId` directly, so swapping providers
 * or running both never touches route code.
 *
 * The one rule that must hold for any future provider: payment confirmation is verified
 * server-side from the provider's own webhook signature, never trusted from a frontend
 * "payment successful" callback.
 */
export interface BillingProvider {
  name: string;
  /** Called from the provider's verified webhook once a subscription's state actually changes. */
  applySubscriptionUpdate(input: {
    tenantId: string;
    status: SubscriptionStatus;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date | null;
  }): Promise<void>;
}

export class ManualBillingProvider implements BillingProvider {
  name = "manual";

  async applySubscriptionUpdate(input: Parameters<BillingProvider["applySubscriptionUpdate"]>[0]) {
    await prisma.subscription.update({
      where: { tenantId: input.tenantId },
      data: {
        status: input.status,
        billingProvider: this.name,
        providerCustomerId: input.providerCustomerId,
        providerSubscriptionId: input.providerSubscriptionId,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
      },
    });
  }
}

export const billingProvider: BillingProvider = new ManualBillingProvider();
