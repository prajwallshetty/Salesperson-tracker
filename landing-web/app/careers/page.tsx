import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <PageShell title="Careers">
      <p>We don&apos;t have open roles listed publicly right now.</p>
      <p>
        If you&apos;re interested in working on Sales Grid, send us a note at{" "}
        <a href="mailto:growthbridge16@gmail.com" className="font-medium text-primary hover:underline">
          growthbridge16@gmail.com
        </a>{" "}
        and we&apos;ll get back to you.
      </p>
    </PageShell>
  );
}
