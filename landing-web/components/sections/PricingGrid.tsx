"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "../Button";
import { cn } from "@/lib/utils";
import { links } from "@/lib/links";
import type { PublicPlan } from "@/lib/plans";

const HIGHLIGHTED_KEY = "PROFESSIONAL";

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

export function PricingGrid({ plans }: { plans: PublicPlan[] }) {
  const [yearly, setYearly] = useState(false);
  const hasAnnual = plans.every((p) => p.annualPrice !== null || p.monthlyPrice === 0);

  return (
    <div>
      {hasAnnual && (
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={cn("text-sm font-medium", !yearly ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            onClick={() => setYearly((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              yearly ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", yearly ? "translate-x-6" : "translate-x-1")} />
          </button>
          <span className={cn("text-sm font-medium", yearly ? "text-foreground" : "text-muted-foreground")}>
            Yearly <span className="text-success">— save with annual billing</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isEnterprise = plan.monthlyPrice === 0;
          const highlighted = plan.key === HIGHLIGHTED_KEY;
          const showYearly = yearly && plan.annualPrice != null;
          const price = isEnterprise ? null : showYearly ? plan.annualPrice! : plan.monthlyPrice;
          const period = isEnterprise ? "" : showYearly ? "/year" : "/month";
          const savingsPct =
            plan.annualPrice && plan.monthlyPrice > 0
              ? Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)
              : 0;

          return (
            <div
              key={plan.key}
              className={cn(
                "flex flex-col rounded-2xl border p-6 shadow-card",
                highlighted ? "border-primary bg-card shadow-glow" : "border-border/70 bg-card"
              )}
            >
              {highlighted && (
                <span className="mb-3 inline-flex w-fit items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Up to {plan.maxSalespersons.toLocaleString("en-IN")} salespeople</p>

              <div className="mt-5 flex items-baseline gap-1">
                {isEnterprise ? (
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">Contact Sales</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold tracking-tight text-foreground">₹{formatInr(price!)}</span>
                    <span className="text-sm font-medium text-muted-foreground">{period}</span>
                  </>
                )}
              </div>
              {showYearly && savingsPct > 0 && (
                <p className="mt-1 text-xs font-semibold text-success">Save {savingsPct}% vs. monthly billing</p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5">
                {[
                  `${plan.maxSalespersons.toLocaleString("en-IN")} salespeople`,
                  `${plan.maxAdmins} admin ${plan.maxAdmins === 1 ? "seat" : "seats"}`,
                  plan.features.gpsTracking && "GPS tracking",
                  plan.features.liveTracking && "Live field tracking",
                  plan.features.routeHistory && "Route history",
                  plan.features.territories && "Territory management",
                  plan.features.reports && "Advanced reports",
                ]
                  .filter(Boolean)
                  .map((f) => (
                    <li key={f as string} className="flex items-center gap-2.5 text-sm text-foreground/90">
                      <Check className="h-4 w-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
              </ul>

              <Button
                href={isEnterprise ? "mailto:growthbridge16@gmail.com?subject=Sales%20Grid%20Enterprise" : links.signup}
                variant={highlighted ? "primary" : "outline"}
                className="mt-6 w-full"
              >
                {isEnterprise ? "Contact Sales" : "Start Free Trial"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
