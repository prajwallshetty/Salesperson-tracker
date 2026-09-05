import { Container } from "../Container";
import { SectionHeading } from "../SectionHeading";
import { PricingGrid } from "./PricingGrid";
import { PricingComparisonTable } from "./PricingComparisonTable";
import { Button } from "../Button";
import type { PublicPlan, FeatureCatalogEntry } from "@/lib/plans";

export function Pricing({ plans, featureCatalog }: { plans: PublicPlan[]; featureCatalog: FeatureCatalogEntry[] }) {
  return (
    <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Pricing Plans"
          title="Simple, Transparent Pricing"
          description="Choose the perfect field sales tracking and sales force management software plan for your team. Every plan includes the full sales CRM workflow — GPS-verified visits, leads, targets, orders and reports."
        />
        <div className="mt-14">
          {plans.length > 0 ? (
            <>
              <PricingGrid plans={plans} featureCatalog={featureCatalog} />
              <PricingComparisonTable plans={plans} featureCatalog={featureCatalog} />
            </>
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
