"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, formatDurationMin, formatKm, initials } from "@/lib/format";
import { BoxIcon, MapPinIcon, TargetIcon, TrendingUpIcon, UsersIcon, WalletIcon, ClockIcon } from "@/components/icons";
import type { LeaderboardEntry, PerformanceDetail } from "@/types";
import clsx from "clsx";

export default function PerformancePage() {
  const user = useAuthStore((s) => s.user);
  const [detail, setDetail] = useState<PerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "week" | "month">("month");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);

  useEffect(() => {
    if (!user?.salespersonId) return;
    setLoading(true);
    api
      .get<PerformanceDetail>(`/performance/${user.salespersonId}`)
      .then((res) => setDetail(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load performance")))
      .finally(() => setLoading(false));
  }, [user?.salespersonId]);

  useEffect(() => {
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    api
      .get<LeaderboardEntry[]>("/performance", { params: { range } })
      .then((res) => setLeaderboard(res.data))
      .catch(() => setLeaderboardError(true))
      .finally(() => setLeaderboardLoading(false));
  }, [range]);

  return (
    <div>
      <PageHeader title="My Performance" />
      <div className="space-y-5 px-4 pt-4 pb-8">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : detail ? (
          <>
            <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5">
              <ProgressRing percent={detail.achievementPercent} label={`${detail.achievementPercent}%`} sublabel="Monthly" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-slate-700">Monthly Target Achievement</p>
                <p className="text-lg font-extrabold text-slate-900">{formatCurrency(detail.monthlySales)}</p>
                <p className="text-xs text-slate-400">of {formatCurrency(detail.targetAmount)} target</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                <p className="text-[10px] font-semibold text-slate-400">Today</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">{formatCurrency(detail.dailySales)}</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                <p className="text-[10px] font-semibold text-slate-400">This Week</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">{formatCurrency(detail.weeklySales)}</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                <p className="text-[10px] font-semibold text-slate-400">This Month</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">{formatCurrency(detail.monthlySales)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<BoxIcon className="h-4 w-4" />} tone="brand" label="Orders (Month)" value={String(detail.monthlyOrders)} />
              <StatCard icon={<UsersIcon className="h-4 w-4" />} tone="emerald" label="Visits (Month)" value={String(detail.monthlyVisits)} />
              <StatCard icon={<TargetIcon className="h-4 w-4" />} tone="amber" label="New Customers" value={String(detail.newCustomers)} />
              <StatCard icon={<TrendingUpIcon className="h-4 w-4" />} tone="brand" label="Follow-ups Done" value={String(detail.followUpsCompleted)} />
              <StatCard icon={<WalletIcon className="h-4 w-4" />} tone="slate" label="Collections" value={formatCurrency(detail.monthlyCollections)} />
              <StatCard icon={<MapPinIcon className="h-4 w-4" />} tone="emerald" label="Distance" value={formatKm(detail.totalDistanceKm)} />
              <StatCard icon={<ClockIcon className="h-4 w-4" />} tone="slate" label="Working Hours" value={formatDurationMin(detail.workingHours * 60)} />
              <StatCard icon={<TrendingUpIcon className="h-4 w-4" />} tone="brand" label="Avg Order Value" value={formatCurrency(detail.avgOrderValue)} />
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-slate-400">No performance data available.</p>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Leaderboard</h2>
            <div className="w-44">
              <SegmentedControl
                value={range}
                onChange={setRange}
                options={[
                  { value: "today", label: "Today" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
              />
            </div>
          </div>
          {leaderboardLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : leaderboardError ? (
            <p className="text-xs text-slate-400">Leaderboard unavailable.</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((entry) => {
                const isMe = entry.salespersonId === user?.salespersonId;
                return (
                  <li
                    key={entry.salespersonId}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl border p-3",
                      isMe ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                        entry.rank === 1
                          ? "bg-amber-400 text-white"
                          : entry.rank === 2
                          ? "bg-slate-300 text-white"
                          : entry.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {entry.rank}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {initials(entry.name)}
                    </span>
                    <span className={clsx("flex-1 truncate text-sm font-semibold", isMe ? "text-brand-800" : "text-slate-700")}>
                      {entry.name} {isMe && <span className="text-xs font-normal text-brand-500">(You)</span>}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">{formatCurrency(entry.sales)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
