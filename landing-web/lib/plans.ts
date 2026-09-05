export interface PublicPlan {
  key: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number | null;
  maxSalespersons: number;
  maxAdmins: number;
  features: Record<string, boolean>;
  displayOrder: number;
}

export interface FeatureCatalogEntry {
  key: string;
  label: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Fetched server-side (this file is only ever imported by a Server Component) from the same
// SubscriptionPlan table the backend enforces limits against - see server/src/routes/
// public.routes.ts - so the pricing section can never drift from what a tenant actually gets.
// Revalidates hourly rather than on every request: plan pricing changes rarely enough that an
// hour of staleness is an acceptable trade for not hitting the API on every page view.
export async function getPublicPlans(): Promise<PublicPlan[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/plans`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as PublicPlan[];
  } catch {
    // The landing page must render even if the API is briefly unreachable at build/request
    // time - the Pricing section falls back to a "view live pricing" state rather than crashing.
    return [];
  }
}

// The human label for every structured feature entitlement key, in canonical display order -
// see server/src/lib/featureEntitlements.ts, the single source of truth this mirrors. Used so
// the pricing/comparison UI never hard-codes its own copy of what e.g. "GPS_TRACKING" means.
export async function getFeatureCatalog(): Promise<FeatureCatalogEntry[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/feature-catalog`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as FeatureCatalogEntry[];
  } catch {
    return [];
  }
}
