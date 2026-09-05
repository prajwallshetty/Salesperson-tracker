import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { TrustSection } from "@/components/sections/TrustSection";
import { ProductOverview } from "@/components/sections/ProductOverview";
import { FeatureSection } from "@/components/sections/FeatureSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCta } from "@/components/sections/FinalCta";
import {
  FieldVisitMockup,
  LiveGpsMockup,
  CustomersLeadsMockup,
  TargetsMockup,
  OrdersWorkflowMockup,
  ReportingMockup,
} from "@/components/mockups/FeatureMockups";
import { getPublicPlans } from "@/lib/plans";

export default async function HomePage() {
  const plans = await getPublicPlans();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <TrustSection />
        <ProductOverview />

        <FeatureSection
          id="field-sales"
          eyebrow="Field sales"
          title="Know what's happening in the field."
          description="See planned visits, check-ins, check-outs, notes and photos as they happen — without calling every salesperson to ask."
          bullets={[
            "Planned visits with GPS-verified check-in and check-out",
            "Visit notes, outcomes and photos attached automatically",
            "Follow-ups created directly from a visit",
            "Live visit status: planned, in progress, completed",
          ]}
          visual={<FieldVisitMockup />}
        />

        <FeatureSection
          reverse
          tint
          eyebrow="Live GPS"
          title="Real-time visibility. Without the guesswork."
          description="See active salespeople on a live map during field work, with last-updated time and current status."
          bullets={[
            "Live salesperson markers during active field work",
            "Last-updated time and field-work status at a glance",
            "Route history for any completed day",
            "Real device GPS only — never a simulated position",
          ]}
          visual={<LiveGpsMockup />}
        />

        <FeatureSection
          eyebrow="Customers & leads"
          title="Every customer. Every opportunity. Organized."
          description="Customer profiles, leads and pipeline, all connected to visit history and the salesperson who owns them."
          bullets={[
            "Full customer profiles with contact and visit history",
            "Lead pipeline from new to converted",
            "Follow-ups tied to a customer or a lead",
            "Clear salesperson ownership for every record",
          ]}
          visual={<CustomersLeadsMockup />}
        />

        <FeatureSection
          reverse
          tint
          eyebrow="Targets & performance"
          title="Make performance measurable."
          description="Sales targets, achievement percentage and salesperson ranking — without an overwhelming wall of charts."
          bullets={[
            "Daily, weekly or monthly targets per salesperson",
            "Achievement percentage tracked automatically",
            "Salesperson and territory performance ranking",
            "Visit completion alongside revenue metrics",
          ]}
          visual={<TargetsMockup />}
        />

        <FeatureSection
          eyebrow="Orders, quotations & collections"
          title="From opportunity to order."
          description="Sales Grid keeps the whole process connected: a lead becomes a visit, a visit becomes a quotation, and a quotation becomes an order."
          bullets={[
            "Quotations with correct pricing, discount and tax",
            "One-click conversion from quotation to order",
            "Collections recorded against the right order",
            "Nothing re-entered between stages",
          ]}
          visual={<OrdersWorkflowMockup />}
        />

        <FeatureSection
          reverse
          tint
          eyebrow="Reporting"
          title="Decisions backed by real sales data."
          description="Sales, visit, customer, target and territory reports — always reflecting what actually happened in the field."
          bullets={[
            "Sales and collection reports by salesperson or territory",
            "Visit and target-achievement reporting",
            "Data sourced directly from field activity, not estimates",
          ]}
          visual={<ReportingMockup />}
        />

        <HowItWorks />
        <FeatureGrid />
        <Pricing plans={plans} />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
