import { Container } from "../Container";
import { Button } from "../Button";
import { links } from "@/lib/links";

export function FinalCta() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.18),transparent)]"
            aria-hidden="true"
          />
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to take control of your sales team?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/85">
            Give your team the tools to sell smarter, move faster and stay accountable.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href={links.signup} size="lg" className="bg-white text-primary shadow-none hover:bg-white/90">
              Start Free Trial
            </Button>
            <Button
              href="mailto:growthbridge16@gmail.com"
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Talk to Sales
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
