// Centralized cross-app URLs. admin-web and sales-app are separately deployed Next.js apps
// (see the monorepo's README/API_CONTRACT.md) - every CTA on this marketing site links to one
// of their real routes, never a placeholder "#" or a fake endpoint created just for this page.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
const SALES_URL = process.env.NEXT_PUBLIC_SALES_URL || "http://localhost:5174";

export const links = {
  // Tenant onboarding - POST /api/auth/signup on the backend, admin-web's /signup page.
  signup: `${APP_URL}/signup`,
  // Admin/tenant login. Salesperson sign-in is access-code-based on a separate app (SALES_URL)
  // and is intentionally not linked from a public marketing CTA - it's distributed by an admin
  // to their own team, not something a site visitor self-serves into.
  login: `${APP_URL}/login`,
  salesApp: SALES_URL,
} as const;
