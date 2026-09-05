import { cn } from "@/lib/utils";

// No logo.png exists anywhere in the monorepo to reuse (checked admin-web, sales-app, server,
// and the repo root) - admin-web/sales-app's own login pages use the same kind of text/icon
// mark this renders, not an image file. This mirrors that existing pattern (a small rounded
// badge + wordmark) rather than inventing a different visual identity. Swap this for an
// <Image src="/logo.png" .../> the moment a real logo file is added to public/.
export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/30">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
          <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
          <rect x="12" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
          <rect x="2" y="12" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
          <rect x="12" y="12" width="6" height="6" rx="1.5" fill="currentColor" />
        </svg>
      </span>
      {!iconOnly && <span className="text-lg font-bold tracking-tight text-foreground">SalesGrid</span>}
    </span>
  );
}
