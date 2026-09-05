import { ArrowRight } from "lucide-react";
import { Container } from "../Container";
import { Button } from "../Button";
import { HeroPreview } from "../mockups/HeroPreview";
import { links } from "@/lib/links";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.primary.soft),transparent)]"
        aria-hidden="true"
      />
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Turn Field Sales Into a Growth Engine.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
            Sales Grid gives your sales team one powerful platform to manage customers, visits,
            leads, targets, orders and real-time field operations.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button href={links.signup} size="lg">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="#features" variant="outline" size="lg">
              Explore Features
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            No complex setup &middot; Built for modern sales teams
          </p>
        </div>

        <HeroPreview />
      </Container>
    </section>
  );
}
