import { Container } from "../Container";
import { SectionHeading } from "../SectionHeading";

const STEPS = [
  { number: "01", title: "Set up your sales team", description: "Add your salespeople, territories and products — Sales Grid handles the rest." },
  { number: "02", title: "Let your team manage field activity", description: "Visits, check-ins, leads, quotations and orders — all captured from the field." },
  { number: "03", title: "Track performance and grow", description: "See targets, rankings and reports in real time, and make faster decisions." },
];

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading title="How it works" />
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.number} className="text-center">
              <span className="text-5xl font-extrabold text-primary/20">{s.number}</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
