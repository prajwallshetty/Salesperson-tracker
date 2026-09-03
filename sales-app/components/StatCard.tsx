import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "muted",
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", toneClasses[tone])}>
            {icon}
          </span>
        )}
        <span className="truncate text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-xl font-extrabold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
