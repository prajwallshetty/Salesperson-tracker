import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {message && <p className="max-w-xs text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  );
}
