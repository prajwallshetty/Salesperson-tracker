import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Container } from "./Container";

export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <div className="prose-content mt-8 space-y-5 text-base leading-relaxed text-foreground/90">{children}</div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
