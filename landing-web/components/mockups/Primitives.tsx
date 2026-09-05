import { cn } from "@/lib/utils";

// Small presentational pieces shared by every "product preview" mockup on the page (Hero,
// Field Sales, Live GPS, Targets, etc.) - all static/illustrative with believable sample values,
// never a screenshot or stock photo, and never wired to any real API (this is a public marketing
// page - see section 24 of the task: it must never fetch or display real tenant data).

export function MockPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-card", className)}>{children}</div>
  );
}

export function StatTile({
  label,
  value,
  delta,
  tone = "up",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{value}</p>
      {delta && (
        <p
          className={cn(
            "mt-0.5 text-xs font-semibold",
            tone === "up" && "text-success",
            tone === "down" && "text-red-500",
            tone === "neutral" && "text-muted-foreground"
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

export function MiniBadge({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "success" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "primary" && "bg-primary-soft text-primary",
        tone === "success" && "bg-success-soft text-success",
        tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function AvatarDot({ initials }: { initials: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {initials}
    </span>
  );
}
