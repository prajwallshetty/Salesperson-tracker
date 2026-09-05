"use client";

import { useState } from "react";
import { Check, Rocket, Star, TrendingUp, Briefcase, Users, Crown, ShieldCheck, XCircle, Headphones } from "lucide-react";
import { Button } from "../Button";
import { cn } from "@/lib/utils";
import { links } from "@/lib/links";
import type { PublicPlan, FeatureCatalogEntry } from "@/lib/plans";

const HIGHLIGHTED_KEY = "GROWTH";

// Per-tier accent - maps to the same design tokens used across the app (success/warning/info are
// already defined identically in admin-web's tailwind config; `pink` is new, added only for this
// Enterprise accent - see app/globals.css). Never introduces a color used nowhere else in the app
// beyond this one addition.
const ACCENT: Record<string, { icon: typeof Rocket; iconBg: string; iconColor: string; ring: string; button: string }> = {
  STARTER: { icon: Rocket, iconBg: "bg-primary-soft", iconColor: "text-primary", ring: "border-border/70", button: "" },
  GROWTH: { icon: Star, iconBg: "bg-primary-soft", iconColor: "text-primary", ring: "border-primary", button: "" },
  PROFESSIONAL: { icon: TrendingUp, iconBg: "bg-success-soft", iconColor: "text-success", ring: "border-border/70", button: "bg-success text-white hover:bg-success/90 shadow-none" },
  BUSINESS: { icon: Briefcase, iconBg: "bg-warning-soft", iconColor: "text-warning", ring: "border-border/70", button: "bg-warning text-white hover:bg-warning/90 shadow-none" },
  SCALE: { icon: Users, iconBg: "bg-info-soft", iconColor: "text-info", ring: "border-border/70", button: "bg-info text-white hover:bg-info/90 shadow-none" },
  ENTERPRISE: { icon: Crown, iconBg: "bg-pink-soft", iconColor: "text-pink", ring: "border-border/70", button: "" },
};

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

// Marketing-copy grouping of this tier's OWN new entitlement keys (not the full cumulative set -
// the reference design shows each card's *incremental* features as "Everything in X, plus:").
// Purely presentational: what actually gates access is the structured features map from the
// backend (server/src/lib/featureEntitlements.ts) - this only decides which of that plan's true
// keys get a bullet on this card, using the same catalog's labels, never inventing new copy.
const TIER_OWN_KEYS: Record<string, string[]> = {
  STARTER: [
    "ADMIN_DASHBOARD",
    "SALESPERSON_APP",
    "GPS_TRACKING",
    "CUSTOMER_MANAGEMENT",
    "VISIT_MANAGEMENT",
    "LEADS",
    "QUOTATIONS",
    "BASIC_REPORTS",
    "USER_ROLE_MANAGEMENT",
  ],
  GROWTH: [
    "ADVANCED_PERFORMANCE_ANALYTICS",
    "TERRITORY_MANAGEMENT",
    "ATTENDANCE_MANAGEMENT",
    "ADVANCED_REPORTS",
    "ROUTE_ANALYTICS",
    "SALESPERSON_COMPARISON",
    "TARGET_ANALYTICS",
    "PRIORITY_SUPPORT",
  ],
  PROFESSIONAL: [
    "ADVANCED_LIVE_TRACKING",
    "TERRITORY_ANALYTICS",
    "ADVANCED_SALES_REPORTS",
    "CUSTOM_DASHBOARDS",
    "CUSTOMER_ACTIVITY_ANALYTICS",
    "ADVANCED_PERMISSIONS",
    "EXPORTABLE_REPORTS",
  ],
  BUSINESS: [
    "ADVANCED_MANAGEMENT_DASHBOARD",
    "MULTIPLE_MANAGERS",
    "MANAGER_TEAMS",
    "ADVANCED_TERRITORY_CONTROLS",
    "CUSTOM_REPORTS",
    "API_ACCESS",
    "HIGHER_USAGE_LIMITS",
    "DEDICATED_ONBOARDING",
  ],
  SCALE: ["MULTI_TEAM_MANAGEMENT", "ADVANCED_ANALYTICS", "API_INTEGRATIONS", "HIGHER_GPS_LIMITS", "CUSTOM_ROLES", "DEDICATED_ONBOARDING", "PRIORITY_SUPPORT"],
  ENTERPRISE: [
    "UNLIMITED_USERS",
    "CUSTOM_DEPLOYMENT",
    "SSO",
    "ERP_CRM_INTEGRATIONS",
    "CUSTOM_WORKFLOWS",
    "DEDICATED_ACCOUNT_MANAGER",
    "SLA_SUPPORT",
    "DATA_MIGRATION",
  ],
};

const TIER_PREDECESSOR: Record<string, string> = {
  GROWTH: "Starter",
  PROFESSIONAL: "Growth",
  BUSINESS: "Professional",
  SCALE: "Business",
  ENTERPRISE: "Scale",
};

export function PricingGrid({ plans, featureCatalog }: { plans: PublicPlan[]; featureCatalog: FeatureCatalogEntry[] }) {
  const [yearly, setYearly] = useState(false);
  const labelFor = (key: string) => featureCatalog.find((f) => f.key === key)?.label ?? key;
  const hasAnnual = plans.every((p) => p.annualPrice !== null || p.monthlyPrice === 0);

  return (
    <div>
      {hasAnnual && (
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={cn("text-sm font-medium", !yearly ? "text-foreground" : "text-muted-foreground")}>Monthly Billing</span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Toggle annual billing"
            onClick={() => setYearly((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              yearly ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", yearly ? "translate-x-6" : "translate-x-1")} />
          </button>
          <span className={cn("flex items-center gap-2 text-sm font-medium", yearly ? "text-foreground" : "text-muted-foreground")}>
            Annual Billing
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success">Save 17%</span>
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
          const accent = ACCENT[plan.key] ?? ACCENT.STARTER;
          const Icon = accent.icon;
          const ownKeys = (TIER_OWN_KEYS[plan.key] ?? []).filter((k) => plan.features[k]);
          const predecessor = TIER_PREDECESSOR[plan.key];

          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 shadow-card",
                highlighted ? `${accent.ring} shadow-glow` : accent.ring,
                "bg-card"
              )}
            >
              {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                  Most Popular
                </span>
              )}

              <div className={cn("mb-4 flex size-12 items-center justify-center rounded-2xl", accent.iconBg)}>
                <Icon className={cn("h-6 w-6", accent.iconColor)} />
              </div>

              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {/* Enterprise's maxSalespersons is a large internal "effectively unlimited"
                    sentinel, not the marketed minimum seat count - never render it directly. */}
                {isEnterprise ? "100+ salespeople" : `Up to ${plan.maxSalespersons.toLocaleString("en-IN")} salespeople`}
              </p>

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
              {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}

              <Button
                href={isEnterprise ? "mailto:growthbridge16@gmail.com?subject=Sales%20Grid%20Enterprise" : `${links.signup}?plan=${plan.key.toLowerCase()}&interval=${showYearly ? "yearly" : "monthly"}`}
                variant={highlighted || accent.button === "" ? "primary" : "outline"}
                className={cn("mt-6 w-full", !highlighted && accent.button)}
              >
                {isEnterprise ? "Contact Us" : "Get Started"}
              </Button>

              <ul className="mt-6 flex-1 space-y-2.5">
                {predecessor && (
                  <li className="text-sm font-semibold text-foreground">Everything in {predecessor}, plus:</li>
                )}
                {ownKeys.map((key) => (
                  <li key={key} className="flex items-center gap-2.5 text-sm text-foreground/90">
                    <Check className={cn("h-4 w-4 shrink-0", accent.iconColor)} /> {labelFor(key)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 border-t border-border/60 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <Benefit icon={<ShieldCheck className="h-5 w-5" />} title="No Setup Fees" description="Get started instantly with zero setup charges." />
        <Benefit icon={<XCircle className="h-5 w-5" />} title="Cancel Anytime" description="You can cancel or change your plan anytime." />
        <Benefit icon={<ShieldCheck className="h-5 w-5" />} title="Secure & Reliable" description="Enterprise-grade security to keep your data safe." />
        <Benefit icon={<Headphones className="h-5 w-5" />} title="Great Support" description="Our support team is always ready to help you." />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        All plans include regular updates and new features. Prices are in INR and exclusive of applicable taxes.
      </p>
    </div>
  );
}

function Benefit({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
