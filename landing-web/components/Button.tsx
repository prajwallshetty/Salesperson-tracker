import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "default" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
};

const sizes: Record<Size, string> = {
  default: "h-11 px-5",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}

// Every CTA on this site is a real link to an existing route (admin-web's /signup or /login,
// or an in-page anchor) - see lib/links.ts - never a placeholder href="#".
export function Button({ href, variant = "primary", size = "default", className, children, external }: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const needsPlainAnchor = /^(https?:|mailto:|tel:)/.test(href);
  if (needsPlainAnchor || external) {
    return (
      <a href={href} className={classes} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
