import { redirect } from "next/navigation";

// Server Component: no client JS needed for a bare redirect. Real auth gating happens
// client-side in (protected)/layout.tsx, which bounces to /super-admin/login if there's no
// valid platform session - this route just picks a reasonable default destination.
export default function SuperAdminRootPage() {
  redirect("/super-admin/dashboard");
}
