import {
  Users,
  Building2,
  UserPlus,
  MapPinned,
  Radar,
  Route,
  Target,
  Map,
  Clock,
  FileText,
  ShoppingCart,
  Wallet,
  BarChart3,
  Bell,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Container } from "../Container";
import { SectionHeading } from "../SectionHeading";

const FEATURES = [
  { icon: Users, title: "Sales Team Management", description: "Onboard salespeople, assign managers and territories in minutes." },
  { icon: Building2, title: "Customer Management", description: "A single, organized record for every customer your team sells to." },
  { icon: UserPlus, title: "Lead Management", description: "Track leads from first contact through to a converted customer." },
  { icon: MapPinned, title: "Field Visits", description: "Plan, check in and check out of visits with GPS-verified location." },
  { icon: Radar, title: "GPS Tracking", description: "Real device GPS during field work — never a simulated position." },
  { icon: Route, title: "Route History", description: "Review where a salesperson traveled and how long each stop took." },
  { icon: Target, title: "Targets", description: "Set daily, weekly or monthly targets and track achievement live." },
  { icon: Map, title: "Territories", description: "Organize customers and salespeople by region for clear ownership." },
  { icon: Clock, title: "Attendance", description: "Field-work start/end times captured automatically with location." },
  { icon: FileText, title: "Quotations", description: "Build quotations with correct pricing, discounts and tax." },
  { icon: ShoppingCart, title: "Orders", description: "Convert a quotation to an order without re-entering a thing." },
  { icon: Wallet, title: "Collections", description: "Record payments against orders and keep balances accurate." },
  { icon: BarChart3, title: "Reports", description: "Sales, visit, territory and collection reports, always up to date." },
  { icon: Bell, title: "Notifications", description: "Admins are alerted the moment field activity actually happens." },
  { icon: ShieldCheck, title: "Role-Based Access", description: "Admins and salespeople see exactly what they should — nothing more." },
  { icon: Building, title: "Multi-Tenant Architecture", description: "Your company's data is fully isolated from every other workspace." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-16 bg-muted/40 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Everything included"
          title="Built for how field sales actually works."
          description="No bolted-on modules or paid add-ons for the basics — every plan starts with the full workflow."
        />
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-border/70 bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3.5 text-sm font-bold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
