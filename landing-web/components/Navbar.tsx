"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "./Logo";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "/#product", id: "product" },
  { label: "Features", href: "/#features", id: "features" },
  { label: "Solutions", href: "/#field-sales", id: "field-sales" },
  { label: "Pricing", href: "/#pricing", id: "pricing" },
  { label: "FAQ", href: "/#faq", id: "faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);

      // Simple active section detection for homepage anchor links
      const sections = NAV_LINKS.map((link) => link.id);
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 300) {
        setActiveSection("");
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <header className="sticky top-3 sm:top-4 z-50 w-full px-3.5 sm:px-6 lg:px-8 transition-all duration-300 pointer-events-none">
      <div ref={navRef} className="mx-auto max-w-6xl pointer-events-auto">
        {/* Floating Nav Pill */}
        <div
          className={cn(
            "flex h-14 sm:h-16 w-full items-center justify-between rounded-full border px-4 sm:px-6 transition-all duration-300",
            scrolled
              ? "border-border/80 bg-background/85 shadow-lg shadow-black/[0.04] backdrop-blur-xl"
              : "border-border/60 bg-background/70 shadow-sm shadow-black/[0.02] backdrop-blur-lg hover:border-border/80 hover:bg-background/80"
          )}
        >
          {/* Logo */}
          <Link href="/" aria-label="Sales Grid home" className="shrink-0 transition-transform active:scale-95">
            <Logo />
          </Link>

          {/* Desktop Floating Center Links */}
          <nav className="hidden items-center gap-1 rounded-full border border-border/40 bg-muted/50 p-1 backdrop-blur-md lg:flex">
            {NAV_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-foreground/75 hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop Right Action Buttons */}
          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={links.login}
              className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              Log in
            </a>
            <a
              href={links.signup}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 active:scale-95"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Floating Dropdown Menu */}
        {open && (
          <div className="mt-2.5 w-full rounded-2xl border border-border/80 bg-background/95 p-4 shadow-xl shadow-black/10 backdrop-blur-2xl lg:hidden animate-fade-up">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                    activeSection === item.id ? "bg-muted font-semibold text-foreground" : "text-foreground/80"
                  )}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
              <a
                href={links.login}
                className="flex h-10 w-full items-center justify-center rounded-xl border border-border/80 bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Log in
              </a>
              <a
                href={links.signup}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 active:scale-98"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

