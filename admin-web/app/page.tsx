import { redirect } from "next/navigation";

// Server Component: no client JS needed for a bare redirect. Auth gating
// still happens client-side in `(dashboard)/layout.tsx`, same as before.
export default function RootPage() {
  redirect("/dashboard");
}
