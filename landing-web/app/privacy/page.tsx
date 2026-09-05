import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2 className="text-xl font-bold text-foreground">Information we collect</h2>
      <p>
        When your company creates a Sales Grid workspace, we collect the account information you
        provide (name, work email, company name) and the business data your team enters while
        using the product — customers, visits, leads, orders and related records. Salespeople
        using the field app also share device location while field work is active, used solely to
        power visit check-in/check-out and live tracking for their own admin.
      </p>

      <h2 className="text-xl font-bold text-foreground">How we use it</h2>
      <p>
        We use this information to operate, secure and improve Sales Grid: authenticating users,
        enforcing that each company&apos;s data stays isolated from every other company&apos;s, and
        responding to support requests. We do not sell your data.
      </p>

      <h2 className="text-xl font-bold text-foreground">Data isolation</h2>
      <p>
        Sales Grid is multi-tenant: every company&apos;s data is scoped to its own workspace and is
        never visible to another company using the platform.
      </p>

      <h2 className="text-xl font-bold text-foreground">Cookies</h2>
      <p>
        The Sales Grid application uses a single essential, httpOnly session cookie to keep you
        signed in. This marketing site does not set tracking or advertising cookies.
      </p>

      <h2 className="text-xl font-bold text-foreground">Data retention</h2>
      <p>
        We retain your company&apos;s data for as long as your workspace is active. If a
        subscription is cancelled or suspended, data is retained (not deleted) so the workspace
        can be reactivated.
      </p>

      <h2 className="text-xl font-bold text-foreground">Contact</h2>
      <p>
        Questions about this policy or a request regarding your data can be sent to{" "}
        <a href="mailto:growthbridge16@gmail.com" className="font-medium text-primary hover:underline">
          growthbridge16@gmail.com
        </a>
        .
      </p>
    </PageShell>
  );
}
