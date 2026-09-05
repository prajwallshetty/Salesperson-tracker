"use client";

import { useState } from "react";
import { Check, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicPlan, FeatureCatalogEntry } from "@/lib/plans";

// Renders every catalog key as a row so this table can never show a feature as included when the
// backend entitlement map (plan.features, sourced from the same DB row the server enforces via
// requireFeature()) says otherwise - there is no separate/marketing copy of this data here.
export function PricingComparisonTable({ plans, featureCatalog }: { plans: PublicPlan[]; featureCatalog: FeatureCatalogEntry[] }) {
  const [open, setOpen] = useState(false);

  if (plans.length === 0 || featureCatalog.length === 0) return null;

  return (
    <div className="mt-14">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
      >
        {open ? "Hide" : "Compare"} full feature list
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">Feature comparison across all Sales Grid pricing plans</caption>
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-semibold text-foreground">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th key={plan.key} scope="col" className="px-4 py-3 text-center font-semibold text-foreground">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureCatalog.map((feature, i) => (
                <tr key={feature.key} className={cn(i % 2 === 1 && "bg-muted/20")}>
                  <th scope="row" className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-left font-medium text-foreground/90">
                    {feature.label}
                  </th>
                  {plans.map((plan) => {
                    const included = !!plan.features[feature.key];
                    return (
                      <td key={plan.key} className="px-4 py-2.5 text-center">
                        {included ? (
                          <Check className="mx-auto h-4 w-4 text-success" aria-label={`Included in ${plan.name}`} />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label={`Not included in ${plan.name}`} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
