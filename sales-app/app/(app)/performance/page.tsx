"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, formatDurationMin, formatKm, initials } from "@/lib/format";
import { Box, Clock, MapPin, Target, TrendingUp, Users, Wallet } from "lucide-react";
import type { LeaderboardEntry, PerformanceDetail } from "@/types";
import { cn } from "@/lib/utils";

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
      <div className="space-y-6 px-4 pb-8 pt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : detail ? (
          <>
            <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <ProgressRing percent={detail.achievementPercent} label={`${detail.achievementPercent}%`} sublabel="Monthly" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Monthly Target Achievement</p>
                <p className="text-xl font-extrabold tracking-tight text-foreground">{formatCurrency(detail.monthlySales)}</p>
                <p className="text-xs text-muted-foreground">of {formatCurrency(detail.targetAmount)} target</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-border/60 bg-card p-3.5 text-center shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Today</p>
                <p className="mt-1.5 text-sm font-extrabold text-foreground">{formatCurrency(detail.dailySales)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-3.5 text-center shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">This Week</p>
                <p className="mt-1.5 text-sm font-extrabold text-foreground">{formatCurrency(detail.weeklySales)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-3.5 text-center shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">This Month</p>
                <p className="mt-1.5 text-sm font-extrabold text-foreground">{formatCurrency(detail.monthlySales)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Box />} tone="primary" label="Orders (Month)" value={String(detail.monthlyOrders)} />
              <StatCard icon={<Users />} tone="success" label="Visits (Month)" value={String(detail.monthlyVisits)} />
              <StatCard icon={<Target />} tone="warning" label="New Customers" value={String(detail.newCustomers)} />
              <StatCard icon={<TrendingUp />} tone="primary" label="Follow-ups Done" value={String(detail.followUpsCompleted)} />
              <StatCard icon={<Wallet />} tone="muted" label="Collections" value={formatCurrency(detail.monthlyCollections)} />
              <StatCard icon={<MapPin />} tone="info" label="Distance" value={formatKm(detail.totalDistanceKm)} />
              <StatCard icon={<Clock />} tone="muted" label="Working Hours" value={formatDurationMin(detail.workingHours * 60)} />
              <StatCard icon={<TrendingUp />} tone="success" label="Avg Order Value" value={formatCurrency(detail.avgOrderValue)} />
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No performance data available.</p>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Leaderboard</h2>
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
            <p className="text-xs text-muted-foreground">Leaderboard unavailable.</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((entry) => {
                const isMe = entry.salespersonId === user?.salespersonId;
                return (
                  <li
                    key={entry.salespersonId}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 shadow-card",
                      isMe ? "border-primary/30 bg-primary-soft" : "border-border/60 bg-card"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                        entry.rank === 1
                          ? "bg-warning text-warning-foreground"
                          : entry.rank === 2
                          ? "bg-muted-foreground/40 text-white"
                          : entry.rank === 3
                          ? "bg-[hsl(28_60%_42%)] text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {entry.rank}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {initials(entry.name)}
                    </span>
                    <span className={cn("flex-1 truncate text-sm font-semibold", isMe ? "text-primary" : "text-foreground")}>
                      {entry.name} {isMe && <span className="text-xs font-normal text-primary/70">(You)</span>}
                    </span>
                    <span className="text-sm font-extrabold text-foreground">{formatCurrency(entry.sales)}</span>
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
