import { Users, Building2, MapPinned, UserPlus, Bell, Target, ShoppingCart, Wallet, Radar, BarChart3 } from "lucide-react";
import { Container } from "../Container";
import { SectionHeading } from "../SectionHeading";
import { Logo } from "../Logo";

const NODES = [
  { icon: Users, label: "Salespeople" },
  { icon: Building2, label: "Customers" },
  { icon: MapPinned, label: "Visits" },
  { icon: UserPlus, label: "Leads" },
  { icon: Bell, label: "Follow-ups" },
  { icon: Target, label: "Targets" },
  { icon: ShoppingCart, label: "Orders" },
  { icon: Wallet, label: "Collections" },
  { icon: Radar, label: "GPS" },
  { icon: BarChart3, label: "Reports" },
];

export function ProductOverview() {
  return (
    <section id="product" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Product overview"
          title="One platform. Your entire sales operation."
          description="Sales Grid connects every part of field sales — so nothing gets lost between a visit, a follow-up and a closed order."
        />

        <div className="relative mx-auto mt-16 flex max-w-4xl flex-col items-center">
          <div className="z-10 mb-8 flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-4 shadow-glow">
            <Logo />
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-5">
            {NODES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-5 text-center shadow-card transition-shadow hover:shadow-card-hover"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
