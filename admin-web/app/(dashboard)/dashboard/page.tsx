"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Users, UserCheck, Wallet, TrendingUp, Footprints, CalendarClock, ShoppingCart, PiggyBank, Target, Radar } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { SkeletonCard, Skeleton } from "@/components/Skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DrilldownDrawer, type DrilldownKind } from "@/components/dashboard/DrilldownDrawer";
import type { DashboardSummary, Order } from "@/types";

const LiveTrackingCard = dynamic(() => import("@/components/dashboard/LiveTrackingCard"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<DrilldownKind>(null);
  const [trend, setTrend] = useState<{ date: string; total: number }[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load dashboard")))
      .finally(() => setLoading(false));

    api
      .get("/dashboard/sales", { params: { range: "month" } })
      .then((res) => {
        const orders: Order[] = res.data ?? [];
        const byDay = new Map<string, number>();
        orders.forEach((o) => {
          const d = formatDate(o.createdAt, "MMM dd");
          byDay.set(d, (byDay.get(d) ?? 0) + (o.grandTotal ?? 0));
        });
        setTrend(Array.from(byDay.entries()).map(([date, total]) => ({ date, total })).slice(-14));
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load sales chart")))
      .finally(() => setChartsLoading(false));
  }, []);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: "salespersons" as DrilldownKind,
        label: "Total Salespersons",
        value: formatNumber(summary.totalSalespersons),
        sub: `${summary.activeSalespersons} active now`,
        icon: <Users className="size-5" />,
        iconBg: "bg-pastel-violet",
        iconColor: "text-primary",
      },
      {
        key: "salespersons" as DrilldownKind,
        label: "Active Salespersons",
        value: formatNumber(summary.activeSalespersons),
        sub: "On field or online",
        icon: <UserCheck className="size-5" />,
        iconBg: "bg-pastel-green",
        iconColor: "text-success",
      },
      {
        key: "sales" as DrilldownKind,
        label: "Today's Sales",
        value: formatCurrency(summary.todaySales),
        sub: "Orders placed today",
        icon: <Wallet className="size-5" />,
        iconBg: "bg-pastel-blue",
        iconColor: "text-info",
      },
      {
        key: "sales" as DrilldownKind,
        label: "Monthly Sales",
        value: formatCurrency(summary.monthlySales),
        sub: "This month to date",
        icon: <TrendingUp className="size-5" />,
        iconBg: "bg-pastel-teal",
        iconColor: "text-primary",
      },
      {
        key: "visits" as DrilldownKind,
        label: "Today's Visits",
        value: formatNumber(summary.todayVisits),
        sub: "Field visits today",
        icon: <Footprints className="size-5" />,
        iconBg: "bg-pastel-pink",
        iconColor: "text-danger",
      },
      {
        key: "followups" as DrilldownKind,
        label: "Pending Follow-ups",
        value: formatNumber(summary.pendingFollowups),
        sub: "Awaiting action",
        icon: <CalendarClock className="size-5" />,
        iconBg: "bg-pastel-amber",
        iconColor: "text-warning",
      },
      {
        key: "orders" as DrilldownKind,
        label: "Today's Orders",
        value: formatNumber(summary.todayOrdersCount),
        sub: "Confirmed + delivered",
        icon: <ShoppingCart className="size-5" />,
        iconBg: "bg-pastel-violet",
        iconColor: "text-primary",
      },
      {
        key: "collections" as DrilldownKind,
        label: "Today's Collections",
        value: formatCurrency(summary.todayCollections),
        sub: "Cash collected today",
        icon: <PiggyBank className="size-5" />,
        iconBg: "bg-pastel-green",
        iconColor: "text-success",
      },
    ];
  }, [summary]);

  const daysElapsed = new Date().getDate();
  const targetPerDay = summary && daysElapsed > 0 ? summary.targetAmount / daysElapsed : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Real-time overview of your sales force performance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <KpiCard
                  label={c.label}
                  value={c.value}
                  sub={c.sub}
                  icon={c.icon}
                  iconBg={c.iconBg}
                  iconColor={c.iconColor}
                  onClick={() => setDrilldown(c.key)}
                />
              </motion.div>
            ))}
      </div>

      {!loading && summary && (
        <button
          onClick={() => setDrilldown("targets")}
          className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <RingProgress percent={summary.achievementPercent} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target vs Achievement</p>
              <p className="text-lg font-bold tracking-tight text-foreground">
                {formatCurrency(summary.achievement)}{" "}
                <span className="text-sm font-normal text-muted-foreground">of {formatCurrency(summary.targetAmount)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Target className="size-4 text-primary" />
            <span className="text-sm text-muted-foreground">{summary.achievementPercent}% of monthly target achieved</span>
          </div>
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Daily order value this month, with target pace for reference.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={trend} targetPerDay={targetPerDay} loading={chartsLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Top Performers</CardTitle>
            <button onClick={() => setDrilldown("top-performers")} className="text-xs font-medium text-primary hover:underline">
              View all
            </button>
          </CardHeader>
          <CardContent>
            <TopPerformers items={summary?.topPerformers ?? []} loading={loading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radar className="size-4 text-primary" /> Live Tracking
              </CardTitle>
              <CardDescription>Where your field team is right now.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LiveTrackingCard />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest visits, orders, collections and leads.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivities />
          </CardContent>
        </Card>
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
    <div className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(240 20% 96%)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="hsl(262 83% 58%)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">{clamped}%</span>
    </div>
  );
}
