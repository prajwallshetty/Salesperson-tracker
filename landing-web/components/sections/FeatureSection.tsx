import { Check } from "lucide-react";
import { Container } from "../Container";
import { cn } from "@/lib/utils";

interface FeatureSectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  tint?: boolean;
}

// Shared two-column "text + product visual" layout reused by Field Sales, Live GPS, Customers &
// Leads, Targets & Performance, Orders Workflow, and Reporting - keeps those six sections
// visually consistent instead of six bespoke layouts.
export function FeatureSection({ id, eyebrow, title, description, bullets, visual, reverse, tint }: FeatureSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-16 py-16 sm:py-20", tint && "bg-muted/40")}>
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className={cn(reverse && "lg:order-2")}>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(reverse && "lg:order-1")}>{visual}</div>
      </Container>
    </section>
  );
}
