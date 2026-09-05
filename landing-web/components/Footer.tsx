import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "./Container";

// "/#section" (not bare "#section") so these work from any page - see Navbar.tsx's NAV_LINKS
// comment for why.
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Solutions", href: "/#field-sales" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "mailto:growthbridge16@gmail.com" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Help Center", href: "/help" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 py-14">
      <Container>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A modern field sales management platform for teams that sell in the real world.
            </p>
            <a href="mailto:growthbridge16@gmail.com" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              growthbridge16@gmail.com
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.includes("#") || l.href.startsWith("mailto:") ? (
                      <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border/70 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Sales Grid. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
