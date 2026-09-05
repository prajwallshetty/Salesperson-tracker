import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2 className="text-xl font-bold text-foreground">Using Sales Grid</h2>
      <p>
        By creating a workspace, you agree to use Sales Grid for legitimate business purposes and
        to keep your account credentials, and any access codes you issue to your salespeople,
        confidential.
      </p>

      <h2 className="text-xl font-bold text-foreground">Your data</h2>
      <p>
        You retain ownership of the business data your company enters into Sales Grid (customers,
        visits, orders, and similar records). We do not use it for any purpose other than
        operating the service for you.
      </p>

      <h2 className="text-xl font-bold text-foreground">Subscriptions and trials</h2>
      <p>
        New workspaces start on a trial. Continued use beyond the trial period requires an active
        paid plan. Plans differ by the number of salespeople and features included, as described
        on our{" "}
        <Link href="/#pricing" className="font-medium text-primary hover:underline">
          pricing page
        </Link>
        . You can upgrade your plan at any time.
      </p>

      <h2 className="text-xl font-bold text-foreground">Suspension</h2>
      <p>
        We may suspend a workspace for non-payment or misuse. Suspension restricts access but does
        not delete your company&apos;s data.
      </p>

      <h2 className="text-xl font-bold text-foreground">Changes</h2>
      <p>We may update these terms from time to time. Material changes will be communicated to workspace admins.</p>

      <h2 className="text-xl font-bold text-foreground">Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href="mailto:growthbridge16@gmail.com" className="font-medium text-primary hover:underline">
          growthbridge16@gmail.com
        </a>
        .
      </p>
    </PageShell>
  );
}
