import { Container } from "../Container";

const CATEGORIES = ["Field Sales", "Distribution", "FMCG", "Retail", "B2B Sales", "Service Teams"];

export function TrustSection() {
  return (
    <section className="border-y border-border/70 bg-muted/40 py-12">
      <Container>
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Built for teams that sell in the real world.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {CATEGORIES.map((c) => (
            <span key={c} className="text-base font-semibold text-foreground/70">
              {c}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
