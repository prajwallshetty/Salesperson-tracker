import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell title="About Sales Grid">
      <p>
        Sales Grid is a field sales management platform built for companies that manage sales
        teams, customers, visits, leads, orders and field operations. It brings salespeople,
        customers, visits, targets, orders and GPS tracking into one connected workspace, so
        managers can see what&apos;s happening in the field without constantly calling their team.
      </p>
      <p>
        We&apos;re a small, product-focused team building Sales Grid for real field sales
        operations — distribution, FMCG, retail, B2B sales and service teams.
      </p>
      <p>
        Questions about the product or your account? Reach us at{" "}
        <a href="mailto:growthbridge16@gmail.com" className="font-medium text-primary hover:underline">
          growthbridge16@gmail.com
        </a>
        .
      </p>
    </PageShell>
  );
}
