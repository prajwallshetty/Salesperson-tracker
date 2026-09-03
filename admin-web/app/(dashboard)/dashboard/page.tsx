"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { SkeletonCard } from "@/components/Skeleton";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { DrilldownDrawer, type DrilldownKind } from "@/components/dashboard/DrilldownDrawer";
import {
  IconUsers,
  IconWallet,
  IconChart,
  IconRoute,
  IconFollowUp,
  IconOrders,
  IconTarget,
} from "@/components/icons";
import type { DashboardSummary, Order, TargetRow } from "@/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<DrilldownKind>(null);
  const [trend, setTrend] = useState<{ date: string; total: number }[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load dashboard")))
      .finally(() => setLoading(false));

    Promise.all([api.get("/dashboard/sales?range=month"), api.get("/dashboard/targets")])
      .then(([salesRes, targetsRes]) => {
        const orders: Order[] = salesRes.data ?? [];
        const byDay = new Map<string, number>();
        orders.forEach((o) => {
          const d = formatDate(o.createdAt, "MMM dd");
          byDay.set(d, (byDay.get(d) ?? 0) + (o.grandTotal ?? 0));
        });
        const series = Array.from(byDay.entries())
          .map(([date, total]) => ({ date, total }))
          .slice(-14);
        setTrend(series);
        setTargets(targetsRes.data ?? []);
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load charts")))
      .finally(() => setChartsLoading(false));
  }, []);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: "salespersons" as DrilldownKind,
        label: "Total Salespersons",
        value: formatNumber(summary.totalSalespersons),
        sub: `${summary.activeSalespersons} active`,
        icon: <IconUsers className="h-4 w-4" />,
      },
      {
        key: "salespersons" as DrilldownKind,
        label: "Active Salespersons",
        value: formatNumber(summary.activeSalespersons),
        sub: "Currently active",
        icon: <IconUsers className="h-4 w-4" />,
        accent: "text-emerald-600 bg-emerald-50",
      },
      {
        key: "sales" as DrilldownKind,
        label: "Today's Sales",
        value: formatCurrency(summary.todaySales),
        sub: "Orders placed today",
        icon: <IconWallet className="h-4 w-4" />,
      },
      {
        key: "sales" as DrilldownKind,
        label: "Monthly Sales",
        value: formatCurrency(summary.monthlySales),
        sub: "This month to date",
        icon: <IconChart className="h-4 w-4" />,
        accent: "text-violet-600 bg-violet-50",
      },
      {
        key: "visits" as DrilldownKind,
        label: "Today's Visits",
        value: formatNumber(summary.todayVisits),
        sub: "Field visits today",
        icon: <IconRoute className="h-4 w-4" />,
        accent: "text-cyan-600 bg-cyan-50",
      },
      {
        key: "followups" as DrilldownKind,
        label: "Pending Follow-ups",
        value: formatNumber(summary.pendingFollowups),
        sub: "Awaiting action",
        icon: <IconFollowUp className="h-4 w-4" />,
        accent: "text-amber-600 bg-amber-50",
      },
      {
        key: "orders" as DrilldownKind,
        label: "Orders (Today)",
        value: formatNumber(summary.todayOrdersCount),
        sub: "Confirmed + delivered",
        icon: <IconOrders className="h-4 w-4" />,
      },
      {
        key: "collections" as DrilldownKind,
        label: "Collections (Today)",
        value: formatCurrency(summary.todayCollections),
        sub: "Cash collected today",
        icon: <IconWallet className="h-4 w-4" />,
        accent: "text-emerald-600 bg-emerald-50",
      },
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">Real-time overview of your sales force performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((c, i) => (
              <KpiCard
                key={i}
                label={c.label}
                value={c.value}
                sub={c.sub}
                icon={c.icon}
                accent={c.accent}
                onClick={() => setDrilldown(c.key)}
              />
            ))}
      </div>

      {!loading && summary && (
        <button
          onClick={() => setDrilldown("targets")}
          className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <RingProgress percent={summary.achievementPercent} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Target vs Achievement</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatCurrency(summary.achievement)}{" "}
                <span className="text-sm font-normal text-slate-400">of {formatCurrency(summary.targetAmount)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <IconTarget className="h-4 w-4 text-brand-500" />
            <span className="text-sm text-slate-500">{summary.achievementPercent}% of monthly target achieved</span>
          </div>
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Sales Trend</p>
              <p className="text-xs text-slate-400">Daily order value, last 14 active days this month</p>
            </div>
          </div>
          {chartsLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
          ) : trend.length === 0 ? (
            <EmptyState title="No sales data yet" message="Sales trend will appear once orders come in." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ left: -18, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3d63f5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3d63f5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="total" stroke="#3d63f5" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Top Performers</p>
            <button
              onClick={() => setDrilldown("top-performers")}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : !summary || summary.topPerformers.length === 0 ? (
            <EmptyState title="No sales yet" message="Leaderboard appears once sales are recorded." />
          ) : (
            <div className="space-y-1">
              {summary.topPerformers.map((p, i) => (
                <div key={p.salespersonId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                        ? "bg-slate-200 text-slate-600"
                        : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={p.name} src={p.avatarUrl} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">{p.name}</span>
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(p.sales)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <button className="mb-1 flex w-full items-center justify-between" onClick={() => setDrilldown("targets")}>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700">Target vs Achievement by Salesperson</p>
            <p className="text-xs text-slate-400">Current period target completion, per rep</p>
          </div>
          <span className="text-xs font-medium text-brand-600">View details</span>
        </button>
        {chartsLoading ? (
          <div className="mt-4 h-72 animate-pulse rounded-lg bg-slate-100" />
        ) : targets.length === 0 ? (
          <EmptyState title="No targets set" message="Set targets from a salesperson's profile to see this chart." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={targets} margin={{ left: -18, right: 10, top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="targetAmount" name="Target" fill="#dbe6fe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="achieved" name="Achieved" fill="#3d63f5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <DrilldownDrawer kind={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  );
}

function RingProgress({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#eef1f6" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#3d63f5"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-semibold text-slate-700">{clamped}%</span>
    </div>
  );
}
