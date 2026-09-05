"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser, BillingInterval, PublicPlan } from "@/types";

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

interface PlanPickerDialogProps {
  open: boolean;
  onClose: () => void;
  currentPlanKey: string;
  currentInterval: BillingInterval;
  currentSalespersonCount: number;
  admin: Pick<AuthUser, "name" | "email">;
  /** Called once the payment popup reports success. The parent should re-fetch /billing/subscription -
   * this is a hint to refresh, never proof the subscription is actually active (only the webhook decides that). */
  onCheckoutSubmitted: () => void;
  /** Pre-selects the billing interval toggle and outlines one card - e.g. arriving here right
   * after signup with a plan chosen on the pricing page. Purely a UI hint; never trusted as price. */
  initialInterval?: BillingInterval;
  highlightPlanKey?: string;
}

export function PlanPickerDialog({
  open,
  onClose,
  currentPlanKey,
  currentInterval,
  currentSalespersonCount,
  admin,
  onCheckoutSubmitted,
  initialInterval,
  highlightPlanKey,
}: PlanPickerDialogProps) {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval ?? currentInterval);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInterval(initialInterval ?? currentInterval);
    api
      .get("/public/plans")
      .then((res) => setPlans(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load plans")));
  }, [open, currentInterval]);

  const handleSelect = async (plan: PublicPlan) => {
    if (plan.monthlyPrice === 0) {
      window.location.assign("mailto:growthbridge16@gmail.com?subject=Sales%20Grid%20Enterprise");
      return;
    }
    setBusyKey(plan.key);
    try {
      const res = await api.post("/billing/checkout", { planKey: plan.key, interval });
      if (res.data.changed) {
        // Already had a live Razorpay subscription - the backend changed its plan directly via
        // Razorpay's subscriptions.update, no checkout popup involved (see billing.routes.ts).
        toast.success(`Switched to the ${plan.name} plan.`);
        onCheckoutSubmitted();
        onClose();
        return;
      }
      const { razorpaySubscriptionId, razorpayKeyId } = res.data as { razorpaySubscriptionId: string; razorpayKeyId: string };
      await openRazorpayCheckout({
        keyId: razorpayKeyId,
        subscriptionId: razorpaySubscriptionId,
        customerName: admin.name,
        customerEmail: admin.email,
        planLabel: `${plan.name} plan (${interval === "MONTHLY" ? "Monthly" : "Yearly"})`,
        onSuccess: () => {
          toast.success("Payment received — confirming your subscription. This can take a few moments.");
          onCheckoutSubmitted();
          onClose();
        },
        onDismiss: () => setBusyKey(null),
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't start checkout"));
      setBusyKey(null);
    }
  };

  const hasAnnual = plans?.some((p) => p.annualPrice !== null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>Pricing is billed per tenant, not per salesperson seat. Your data is never affected by a plan change.</DialogDescription>
        </DialogHeader>

        {hasAnnual && (
          <div className="flex items-center justify-center gap-3">
            <span className={cn("text-sm font-medium", interval === "MONTHLY" ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={interval === "YEARLY"}
              onClick={() => setInterval((v) => (v === "MONTHLY" ? "YEARLY" : "MONTHLY"))}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                interval === "YEARLY" ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  interval === "YEARLY" ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn("text-sm font-medium", interval === "YEARLY" ? "text-foreground" : "text-muted-foreground")}>Yearly</span>
          </div>
        )}

        {!plans ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isEnterprise = plan.monthlyPrice === 0;
              const isCurrent = plan.key === currentPlanKey && interval === currentInterval;
              const price = isEnterprise ? null : interval === "YEARLY" && plan.annualPrice != null ? plan.annualPrice : plan.monthlyPrice;
              const isDowngrade = plan.maxSalespersons < currentSalespersonCount;

              const isHighlighted = !isCurrent && highlightPlanKey?.toUpperCase() === plan.key;

              return (
                <div
                  key={plan.key}
                  className={cn(
                    "flex flex-col rounded-2xl border p-4",
                    isCurrent
                      ? "border-primary bg-primary-soft/40"
                      : isHighlighted
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/70 bg-card"
                  )}
                >
                  {isHighlighted && <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">Your selection</span>}
                  <p className="text-sm font-bold text-foreground">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {/* Enterprise's maxSalespersons is a large internal "effectively unlimited"
                        sentinel, not the marketed minimum seat count - never render it directly. */}
                    {isEnterprise ? "100+ salespeople" : `Up to ${plan.maxSalespersons.toLocaleString("en-IN")} salespeople`}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    {isEnterprise ? (
                      <span className="text-lg font-extrabold text-foreground">Contact Sales</span>
                    ) : (
                      <>
                        <span className="text-2xl font-extrabold tracking-tight text-foreground">₹{formatInr(price!)}</span>
                        <span className="text-xs font-medium text-muted-foreground">/{interval === "YEARLY" ? "year" : "month"}</span>
                      </>
                    )}
                  </div>
                  {isDowngrade && (
                    <p className="mt-2 text-xs font-medium text-warning">
                      You have {currentSalespersonCount} active salespeople. You won&apos;t be able to add more until you&apos;re back under this
                      plan&apos;s limit — none will be removed.
                    </p>
                  )}
                  <Button
                    className="mt-4 w-full"
                    size="sm"
                    variant={isCurrent ? "outline" : "primary"}
                    disabled={isCurrent || busyKey === plan.key}
                    loading={busyKey === plan.key}
                    onClick={() => handleSelect(plan)}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="size-3.5" /> Current plan
                      </>
                    ) : isEnterprise ? (
                      "Contact Sales"
                    ) : (
                      "Select"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
