// Single source of truth for Sales Grid's structured plan entitlements. Every application
// (landing-web's pricing page, admin-web's billing/plan-comparison UI, Super Admin's plan editor,
// and every backend requireFeature() gate) reads feature availability from
// SubscriptionPlan.features - a flat { [FEATURE_KEY]: boolean } map keyed by the constants below,
// never free-text display strings. This file is where a key's human label and its "which plans
// include it" default lives; the database row is still what's actually enforced at request time.
export const FEATURE_CATALOG: { key: string; label: string }[] = [
  // Starter (baseline, every paid plan includes these)
  { key: "ADMIN_DASHBOARD", label: "Admin Dashboard" },
  { key: "SALESPERSON_APP", label: "Salesperson App" },
  { key: "GPS_TRACKING", label: "GPS Tracking" },
  { key: "CUSTOMER_MANAGEMENT", label: "Customer Management" },
  { key: "VISIT_MANAGEMENT", label: "Visit Management" },
  { key: "LEADS", label: "Leads" },
  { key: "FOLLOWUPS", label: "Follow-ups" },
  { key: "QUOTATIONS", label: "Quotations" },
  { key: "ORDERS", label: "Orders" },
  { key: "BASIC_REPORTS", label: "Basic Reports" },
  { key: "USER_ROLE_MANAGEMENT", label: "User & Role Management" },

  // Growth adds
  { key: "ADVANCED_PERFORMANCE_ANALYTICS", label: "Advanced Performance Analytics" },
  { key: "TERRITORY_MANAGEMENT", label: "Territory Management" },
  { key: "ATTENDANCE_MANAGEMENT", label: "Attendance Management" },
  { key: "ADVANCED_REPORTS", label: "Advanced Reports" },
  { key: "ROUTE_ANALYTICS", label: "Route Analytics" },
  { key: "SALESPERSON_COMPARISON", label: "Salesperson Comparison" },
  { key: "TARGET_ANALYTICS", label: "Target Analytics" },
  { key: "PRIORITY_SUPPORT", label: "Priority Support" },

  // Professional adds
  { key: "ADVANCED_LIVE_TRACKING", label: "Advanced Live Tracking" },
  { key: "TERRITORY_ANALYTICS", label: "Territory-wise Analytics" },
  { key: "ADVANCED_SALES_REPORTS", label: "Advanced Sales Reports" },
  { key: "CUSTOM_DASHBOARDS", label: "Custom Dashboards" },
  { key: "CUSTOMER_ACTIVITY_ANALYTICS", label: "Customer Activity Analytics" },
  { key: "ADVANCED_PERMISSIONS", label: "Advanced Permissions" },
  { key: "EXPORTABLE_REPORTS", label: "Exportable Reports" },

  // Business adds
  { key: "ADVANCED_MANAGEMENT_DASHBOARD", label: "Advanced Management Dashboard" },
  { key: "MULTIPLE_MANAGERS", label: "Multiple Managers" },
  { key: "MANAGER_TEAMS", label: "Manager-wise Teams" },
  { key: "ADVANCED_TERRITORY_CONTROLS", label: "Advanced Territory Controls" },
  { key: "CUSTOM_REPORTS", label: "Custom Reports" },
  { key: "API_ACCESS", label: "API Access" },
  { key: "HIGHER_USAGE_LIMITS", label: "Higher Usage Limits" },
  { key: "DEDICATED_ONBOARDING", label: "Dedicated Onboarding" },

  // Scale adds
  { key: "MULTI_TEAM_MANAGEMENT", label: "Multi-team Management" },
  { key: "ADVANCED_ANALYTICS", label: "Advanced Analytics" },
  { key: "API_INTEGRATIONS", label: "API & Integration Support" },
  { key: "HIGHER_GPS_LIMITS", label: "Higher GPS Limits" },
  { key: "CUSTOM_ROLES", label: "Custom Roles & Permissions" },

  // Enterprise adds
  { key: "UNLIMITED_USERS", label: "Unlimited Users" },
  { key: "CUSTOM_DEPLOYMENT", label: "Custom Deployment" },
  { key: "SSO", label: "SSO & Advanced Security" },
  { key: "ADVANCED_SECURITY", label: "Advanced Security" },
  { key: "ERP_CRM_INTEGRATIONS", label: "ERP/CRM Integrations" },
  { key: "CUSTOM_WORKFLOWS", label: "Custom Workflows" },
  { key: "DEDICATED_ACCOUNT_MANAGER", label: "Dedicated Account Manager" },
  { key: "SLA_SUPPORT", label: "SLA & Premium Support" },
  { key: "DATA_MIGRATION", label: "Data Migration Support" },
];

const TIER_KEYS: Record<string, string[]> = {
  STARTER: [
    "ADMIN_DASHBOARD",
    "SALESPERSON_APP",
    "GPS_TRACKING",
    "CUSTOMER_MANAGEMENT",
    "VISIT_MANAGEMENT",
    "LEADS",
    "FOLLOWUPS",
    "QUOTATIONS",
    "ORDERS",
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
  SCALE: ["MULTI_TEAM_MANAGEMENT", "ADVANCED_ANALYTICS", "API_INTEGRATIONS", "HIGHER_GPS_LIMITS", "CUSTOM_ROLES"],
  ENTERPRISE: [
    "UNLIMITED_USERS",
    "CUSTOM_DEPLOYMENT",
    "SSO",
    "ADVANCED_SECURITY",
    "ERP_CRM_INTEGRATIONS",
    "CUSTOM_WORKFLOWS",
    "DEDICATED_ACCOUNT_MANAGER",
    "SLA_SUPPORT",
    "DATA_MIGRATION",
  ],
};

// Tiers are cumulative ("everything in Growth, plus...") - each plan's key list below is every
// key from every tier up to and including its own.
const TIER_ORDER = ["STARTER", "GROWTH", "PROFESSIONAL", "BUSINESS", "SCALE", "ENTERPRISE"];

/** Every entitlement key a given plan tier includes (cumulative through lower tiers). */
export function cumulativeKeysForTier(planKey: string): string[] {
  const idx = TIER_ORDER.indexOf(planKey);
  if (idx === -1) return [];
  return TIER_ORDER.slice(0, idx + 1).flatMap((tier) => TIER_KEYS[tier]);
}

/** Builds the full { [key]: boolean } feature map for a plan tier - every known key is present. */
export function buildFeatureMap(planKey: string): Record<string, boolean> {
  const included = new Set(cumulativeKeysForTier(planKey));
  const map: Record<string, boolean> = {};
  for (const { key } of FEATURE_CATALOG) map[key] = included.has(key);
  return map;
}
