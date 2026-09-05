"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CreditCard, Users } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlanPickerDialog } from "@/components/billing/PlanPickerDialog";
import { CancelSubscriptionDialog } from "@/components/billing/CancelSubscriptionDialog";
import type { TenantSubscription } from "@/types";

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

const STATUS_BADGE: Record<TenantSubscription["status"], { label: string; variant: "success" | "info" | "warning" | "danger" | "muted" }> = {
  TRIALING: { label: "Trial", variant: "info" },
  ACTIVE: { label: "Active", variant: "success" },
  PAST_DUE: { label: "Payment overdue", variant: "warning" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
  EXPIRED: { label: "Expired", variant: "danger" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

// UI-only banner copy for a blocked tenant, mirroring server/src/lib/entitlements.ts's
// subscriptionBlockedMessage - authoritative enforcement stays server-side (every gated route
// checks the same statuses independently), this is purely to explain the situation here.
const BLOCKED_BANNER: Partial<Record<TenantSubscription["status"], string>> = {
  EXPIRED: "Your trial has expired. Choose a plan to restore full access — your data is safe and nothing has been deleted.",
  CANCELLED: "Your subscription has been cancelled. Choose a plan to reactivate.",
  SUSPENDED: "Your subscription needs attention. Contact billing to restore access.",
  PAST_DUE: "Your last payment didn't go through. Update your payment method to avoid losing access.",
};

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const [sub, setSub] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () =>
    api
      .get("/billing/subscription")
      .then((res) => setSub(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load your subscription")))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a successful Razorpay checkout popup, the subscription only becomes ACTIVE once the
  // backend's webhook has processed the payment - poll briefly rather than trusting the popup.
  const pollForUpdate = (attempt = 0) => {
    if (attempt >= 10) return;
    pollTimer.current = setTimeout(async () => {
      const prevStatus = sub?.status;
      await load();
      if (prevStatus === "TRIALING" || prevStatus === "EXPIRED" || prevStatus === "CANCELLED") {
        pollForUpdate(attempt + 1);
      }
    }, 3000);
  };

  const handleCancel = async (immediately: boolean) => {
    try {
      await api.post("/billing/cancel", { immediately });
      toast.success(immediately ? "Subscription cancelled." : "Your plan will end at the close of the current billing period.");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't cancel your subscription"));
      throw err;
    }
  };

  if (loading || !sub) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Billing & Subscription" description="Manage your plan, usage, and payment status." />
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = STATUS_BADGE[sub.status];
  const banner = BLOCKED_BANNER[sub.status];
  const usagePct = sub.plan.maxSalespersons > 0 ? Math.min(100, Math.round((sub.usage.salespersons / sub.plan.maxSalespersons) * 100) ) : 0;
  const price = sub.billingInterval === "YEARLY" && sub.plan.annualPrice != null ? sub.plan.annualPrice : sub.plan.monthlyPrice;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Billing & Subscription" description="Manage your plan, usage, and payment status." />

      {banner && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{banner}</p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-foreground">{sub.plan.name} plan</p>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sub.plan.monthlyPrice === 0 ? "Custom pricing" : `₹${formatInr(price)} / ${sub.billingInterval === "YEARLY" ? "year" : "month"}`}
              </p>
            </div>
            <div className="flex gap-2">
              {sub.status !== "CANCELLED" && !sub.cancelAtPeriodEnd && (
                <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                  Cancel plan
                </Button>
              )}
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                {sub.status === "EXPIRED" || sub.status === "CANCELLED" ? "Choose a plan" : "Upgrade / Change plan"}
              </Button>
            </div>
          </div>

          {sub.cancelAtPeriodEnd && sub.status !== "CANCELLED" && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
              Your plan is set to cancel on {formatDate(sub.currentPeriodEnd)} and won&apos;t renew.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{sub.status === "TRIALING" ? "Trial ends" : "Renews on"}</p>
                <p className="text-sm font-semibold text-foreground">{sub.status === "TRIALING" ? formatDate(sub.trialEnd) : formatDate(sub.currentPeriodEnd)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Billing interval</p>
                <p className="text-sm font-semibold text-foreground">{sub.billingInterval === "YEARLY" ? "Yearly" : "Monthly"}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="size-4 text-muted-foreground" /> Salesperson usage
              </div>
              <span className="text-sm text-muted-foreground">
                {sub.usage.salespersons} / {sub.plan.maxSalespersons}
              </span>
            </div>
            <Progress value={usagePct} tone={usagePct >= 100 ? "danger" : usagePct >= 80 ? "warning" : "primary"} />
          </div>
        </CardContent>
      </Card>

      {user && (
        <PlanPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          currentPlanKey={sub.plan.key}
          currentInterval={sub.billingInterval}
          currentSalespersonCount={sub.usage.salespersons}
          admin={user}
          onCheckoutSubmitted={() => pollForUpdate()}
        />
      )}
      <CancelSubscriptionDialog open={cancelOpen} onClose={() => setCancelOpen(false)} renewalDate={sub.currentPeriodEnd} onConfirm={handleCancel} />
    </div>
  );
}
