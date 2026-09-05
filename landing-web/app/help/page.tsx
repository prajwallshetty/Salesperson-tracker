import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Help Center" };

export default function HelpPage() {
  return (
    <PageShell title="Help Center">
      <p>
        Most common questions are answered on our{" "}
        <Link href="/#faq" className="font-medium text-primary hover:underline">
          FAQ
        </Link>
        .
      </p>
      <p>
        If you&apos;re an existing customer and need help with your account, contact your admin
        first — they manage your workspace and can reach us directly. Anyone can also email{" "}
        <a href="mailto:growthbridge16@gmail.com" className="font-medium text-primary hover:underline">
          growthbridge16@gmail.com
        </a>{" "}
        and we&apos;ll respond as quickly as we can.
      </p>
    </PageShell>
  );
}
