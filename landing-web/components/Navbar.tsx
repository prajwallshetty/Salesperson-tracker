"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

// "/#section" (not bare "#section") so these work from any page, not just the homepage - a
// bare fragment link on e.g. /about would try to scroll within that page and find nothing.
const NAV_LINKS = [
  { label: "Product", href: "/#product" },
  { label: "Features", href: "/#features" },
  { label: "Solutions", href: "/#field-sales" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Resources", href: "/#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled ? "border-border/70 bg-background/85 backdrop-blur-md" : "border-transparent bg-background"
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Sales Grid home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button href={links.login} variant="ghost" size="default">
            Log in
          </Button>
          <Button href={links.signup} size="default">
            Get Started
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/70 bg-background px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3">
            <Button href={links.login} variant="outline">
              Log in
            </Button>
            <Button href={links.signup}>Get Started</Button>
          </div>
        </div>
      )}
    </header>
  );
}
