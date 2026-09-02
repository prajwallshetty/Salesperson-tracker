import clsx from "clsx";

const TONE_MAP: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

const STATUS_TONE: Record<string, keyof typeof TONE_MAP> = {
  ACTIVE: "green",
  INACTIVE: "slate",
  ONLINE: "green",
  OFFLINE: "slate",
  PENDING: "amber",
  OVERDUE: "red",
  COMPLETED: "green",
  CANCELLED: "slate",
  DELIVERED: "green",
  CONFIRMED: "blue",
  DRAFT: "slate",
  SENT: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
  NEW: "blue",
  CONTACTED: "amber",
  QUALIFIED: "violet",
  NEGOTIATION: "amber",
  CONVERTED: "green",
  LOST: "red",
  PLANNED: "slate",
  IN_PROGRESS: "blue",
  NOT_STARTED: "slate",
  ENDED: "slate",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = TONE_MAP[STATUS_TONE[status] ?? "slate"];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tone)}>
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
