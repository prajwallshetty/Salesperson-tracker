import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFieldWorkStore } from "@/store/fieldwork";
import { formatCurrency, formatKm } from "@/lib/format";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  BellIcon,
  BoxIcon,
  MapPinIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import type { PerformanceSummary, Salesperson } from "@/types";

interface DailyTarget {
  targetAmount: number;
  period: string;
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { status, tracking, todayDistanceKm, starting, ending, geoErrorMessage, startFieldWork, endFieldWork, clearGeoError } =
    useFieldWorkStore();

  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [selfSp, setSelfSp] = useState<Salesperson | null>(null);
  const [target, setTarget] = useState<{ amount: number; achieved: number; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!user?.salespersonId) return;
    setLoading(true);
    try {
      const [summaryRes, spRes, targetsRes, notifRes] = await Promise.all([
        api.get<PerformanceSummary>(`/salespersons/${user.salespersonId}/performance-summary`),
        api.get<Salesperson>(`/salespersons/${user.salespersonId}`),
        api.get<DailyTarget[]>(`/salespersons/${user.salespersonId}/targets`),
        api.get<{ unreadCount: number }>("/notifications"),
      ]);
      setSummary(summaryRes.data);
      setSelfSp(spRes.data);
      setUnreadCount(notifRes.data.unreadCount ?? 0);

      const now = new Date();
      const daily = (targetsRes.data as any[]).find(
        (t) => t.period === "DAILY" && new Date(t.periodStart) <= now && new Date(t.periodEnd) >= now
      );
      const monthly = (targetsRes.data as any[]).find(
        (t) => t.period === "MONTHLY" && new Date(t.periodStart) <= now && new Date(t.periodEnd) >= now
      );
      if (daily) {
        setTarget({ amount: daily.targetAmount, achieved: summaryRes.data.todaySales, label: "Today's Target" });
      } else if (monthly) {
        setTarget({ amount: monthly.targetAmount, achieved: summaryRes.data.monthlySales, label: "Monthly Target" });
      } else {
        setTarget(null);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not load dashboard"));
    } finally {
      setLoading(false);
    }
  }, [user?.salespersonId]);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = status === "ACTIVE" || tracking;
  const distanceKm = tracking ? todayDistanceKm || selfSp?.todayDistanceKm || 0 : selfSp?.todayDistanceKm ?? 0;
  const percent = target && target.amount > 0 ? Math.round((target.achieved / target.amount) * 100) : 0;

  async function handleStart() {
    try {
      await startFieldWork();
    } catch {
      /* handled via toast */
    }
  }

  async function handleEndConfirmed() {
    setConfirmEnd(false);
    try {
      await endFieldWork();
      load();
    } catch {
      /* handled via toast */
    }
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Hello,</p>
          <h1 className="text-xl font-extrabold text-slate-900">{user?.name ?? "Salesperson"}</h1>
        </div>
        <Link
          to="/notifications"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
        >
          <BellIcon className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Field work control */}
      <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-900/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Field Work Status</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
              {isActive ? "Active" : "Not Started"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Today's Distance</p>
            <p className="mt-1 text-lg font-bold">{formatKm(distanceKm)}</p>
          </div>
        </div>

        {geoErrorMessage && (
          <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs leading-snug text-white">
            {geoErrorMessage}
          </div>
        )}

        <div className="mt-4">
          {!isActive ? (
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full rounded-2xl bg-white py-4 text-base font-extrabold text-brand-700 shadow-md active:scale-[0.98] disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start Field Work"}
            </button>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              disabled={ending}
              className="w-full rounded-2xl bg-red-500 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
            >
              {ending ? "Ending…" : "End Field Work"}
            </button>
          )}
        </div>
      </div>

      {/* Target ring */}
      {loading ? (
        <Skeleton className="mb-5 h-40 w-full" />
      ) : target ? (
        <div className="mb-5 flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5">
          <ProgressRing percent={percent} label={`${percent}%`} sublabel={target.label} />
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-slate-700">{target.label}</p>
            <p className="text-lg font-extrabold text-slate-900">{formatCurrency(target.achieved)}</p>
            <p className="text-xs text-slate-400">of {formatCurrency(target.amount)} goal</p>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
          No active sales target set for you yet.
        </div>
      )}

      {/* Stat grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<UsersIcon className="h-4 w-4" />} tone="brand" label="Visits Today" value={String(summary?.todayVisits ?? 0)} />
          <StatCard icon={<TargetIcon className="h-4 w-4" />} tone="amber" label="Pending Follow-ups" value={String(summary?.pendingFollowUps ?? 0)} />
          <StatCard icon={<BoxIcon className="h-4 w-4" />} tone="emerald" label="Orders Today" value={String(summary?.todayOrders ?? 0)} />
          <StatCard icon={<WalletIcon className="h-4 w-4" />} tone="slate" label="Collections (Month)" value={formatCurrency(summary?.monthlyCollections)} />
          <StatCard icon={<TrendingUpIcon className="h-4 w-4" />} tone="brand" label="Sales (Month)" value={formatCurrency(summary?.monthlySales)} />
          <StatCard icon={<MapPinIcon className="h-4 w-4" />} tone="emerald" label="Distance Today" value={formatKm(distanceKm)} />
        </div>
      )}

      <ConfirmDialog
        open={confirmEnd}
        title="End field work?"
        message="This stops live location tracking for the day. If you have an active visit checked in, remember to check out first."
        confirmLabel="End Field Work"
        danger
        onConfirm={handleEndConfirmed}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}
