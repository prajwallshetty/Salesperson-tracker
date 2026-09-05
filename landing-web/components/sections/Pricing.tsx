import { Container } from "../Container";
import { SectionHeading } from "../SectionHeading";
import { PricingGrid } from "./PricingGrid";
import { Button } from "../Button";
import type { PublicPlan } from "@/lib/plans";

export function Pricing({ plans }: { plans: PublicPlan[] }) {
  return (
    <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with your team."
          description="Every plan includes the full workflow — visits, leads, targets, orders and reports. Upgrade any time as your team grows."
        />
        <div className="mt-14">
          {plans.length > 0 ? (
            <PricingGrid plans={plans} />
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">
                Live pricing is temporarily unavailable. Start a free trial or reach out and we&apos;ll set up the right plan for your team.
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                <Button href="mailto:growthbridge16@gmail.com">Contact Sales</Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
