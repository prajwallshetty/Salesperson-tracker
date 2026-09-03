import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: number | null;
  onClick?: () => void;
}

export function KpiCard({ label, value, sub, icon, iconBg = "bg-pastel-violet", iconColor = "text-primary", trend, onClick }: KpiCardProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const trendUp = hasTrend && (trend as number) >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col rounded-2xl border border-border/60 bg-card p-5 text-left shadow-card transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        {icon && (
          <span className={cn("flex size-10 items-center justify-center rounded-xl", iconBg, iconColor)}>{icon}</span>
        )}
        {hasTrend && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              trendUp ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            )}
          >
            {trendUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(trend as number).toFixed(0)}%
          </span>
        )}
      </div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</span>
      {sub && <span className="mt-1 text-xs text-muted-foreground">{sub}</span>}
    </button>
  );
}
