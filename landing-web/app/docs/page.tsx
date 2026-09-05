import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Documentation" };

export default function DocsPage() {
  return (
    <PageShell title="Documentation">
      <p>
        Full product documentation is on its way. In the meantime, the fastest way to understand
        Sales Grid is to start a free trial — the admin dashboard is designed to be self-explanatory,
        and every screen mirrors the workflow described on this site (customers, visits, leads,
        targets, orders and reports).
      </p>
      <p>
        Have a specific question? Email{" "}
        <a href="mailto:growthbridge16@gmail.com" className="font-medium text-primary hover:underline">
          growthbridge16@gmail.com
        </a>{" "}
        and we&apos;ll help directly.
      </p>
    </PageShell>
  );
}
