import { ReactNode } from "react";
import clsx from "clsx";

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "brand" | "emerald" | "amber" | "red";
}) {
  const toneClasses: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    brand: "bg-brand-100 text-brand-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {icon && (
          <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", toneClasses[tone])}>
            {icon}
          </span>
        )}
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
