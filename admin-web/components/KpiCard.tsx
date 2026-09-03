import type { ReactNode } from "react";
import clsx from "clsx";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: string;
  onClick?: () => void;
}

export function KpiCard({ label, value, sub, icon, accent = "text-brand-600 bg-brand-50", onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group flex w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-card transition",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon && <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", accent)}>{icon}</span>}
      </div>
      <span className="text-2xl font-semibold tracking-tight text-slate-800">{value}</span>
      {sub && <span className="mt-1 text-xs text-slate-400">{sub}</span>}
    </button>
  );
}
