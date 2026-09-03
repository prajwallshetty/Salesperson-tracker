"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Bell,
  Box,
  Navigation,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Play,
  Square,
} from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFieldWorkStore } from "@/store/fieldwork";
import { formatCurrency, formatKm } from "@/lib/format";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import type { PerformanceSummary, Salesperson } from "@/types";

interface DailyTarget {
  targetAmount: number;
  period: string;
  periodStart: string;
  periodEnd: string;
}

function useElapsed(startIso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startIso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startIso]);
  if (!startIso) return "00:00:00";
  const diff = Math.max(0, now - new Date(startIso).getTime());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { status, tracking, fieldWorkStartAt, todayDistanceKm, starting, ending, geoErrorMessage, startFieldWork, endFieldWork } =
    useFieldWorkStore();

  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [selfSp, setSelfSp] = useState<Salesperson | null>(null);
  const [target, setTarget] = useState<{ amount: number; achieved: number; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = status === "ACTIVE" || tracking;
  const elapsed = useElapsed(isActive ? fieldWorkStartAt : null);

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
      const daily = targetsRes.data.find(
        (t) => t.period === "DAILY" && new Date(t.periodStart) <= now && new Date(t.periodEnd) >= now
      );
      const monthly = targetsRes.data.find(
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

  const distanceKm = tracking ? todayDistanceKm || selfSp?.todayDistanceKm || 0 : selfSp?.todayDistanceKm ?? 0;
  const percent = target && target.amount > 0 ? Math.round((target.achieved / target.amount) * 100) : 0;
  const firstName = user?.name?.split(" ")[0] ?? "there";

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
    <div className="px-4 pb-6 pt-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {greeting()}, {firstName} 👋
          </p>
          <h1 className="mt-0.5 truncate text-xl font-extrabold tracking-tight text-foreground">
            {user?.name ?? "Salesperson"}
          </h1>
        </div>
        <Link
          href="/notifications"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card shadow-card active:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Field work control */}
      <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[hsl(262_65%_34%)] p-5 text-primary-foreground shadow-lg shadow-primary/25">
        {!isActive ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Field Work</p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-bold">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                  Not Started
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Distance Today</p>
                <p className="mt-1 text-lg font-bold">{formatKm(distanceKm)}</p>
              </div>
            </div>

            {geoErrorMessage && (
              <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs leading-snug text-white">{geoErrorMessage}</div>
            )}

            <Button
              onClick={handleStart}
              disabled={starting}
              size="lg"
              className="mt-4 h-14 w-full bg-white text-primary shadow-md hover:bg-white/90"
            >
              <Play className="h-5 w-5 fill-current" />
              {starting ? "Starting…" : "Start Field Work"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-white" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                Field Work Active
              </p>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">{formatKm(distanceKm)} today</span>
            </div>
            <p className="mt-3 text-center text-4xl font-extrabold tabular-nums tracking-tight">{elapsed}</p>
            <p className="text-center text-[11px] font-medium text-white/70">elapsed since start</p>

            {geoErrorMessage && (
              <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs leading-snug text-white">{geoErrorMessage}</div>
            )}

            <Button
              onClick={() => setConfirmEnd(true)}
              disabled={ending}
              size="lg"
              variant="destructive"
              className="mt-4 h-14 w-full shadow-md"
            >
              <Square className="h-4 w-4 fill-current" />
              {ending ? "Ending…" : "End Field Work"}
            </Button>
          </>
        )}
      </div>

      {/* Target ring */}
      {loading ? (
        <Skeleton className="mb-5 h-40 w-full" />
      ) : target ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-5 rounded-2xl border border-border/60 bg-card p-5 shadow-card"
        >
          <ProgressRing percent={percent} label={`${percent}%`} sublabel={target.label} />
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-muted-foreground">{target.label}</p>
            <p className="text-xl font-extrabold tracking-tight text-foreground">{formatCurrency(target.achieved)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(target.amount)} goal</p>
          </div>
        </motion.div>
      ) : (
        <div className="mb-5 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
          No active sales target set for you yet.
        </div>
      )}

      {/* Stat grid */}
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Today &amp; This Month</p>
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Users />} tone="primary" label="Visits Today" value={String(summary?.todayVisits ?? 0)} />
          <StatCard icon={<Target />} tone="warning" label="Pending Follow-ups" value={String(summary?.pendingFollowUps ?? 0)} />
          <StatCard icon={<Box />} tone="success" label="Orders Today" value={String(summary?.todayOrders ?? 0)} />
          <StatCard icon={<Wallet />} tone="muted" label="Collections (Month)" value={formatCurrency(summary?.monthlyCollections)} />
          <StatCard icon={<TrendingUp />} tone="primary" label="Sales (Month)" value={formatCurrency(summary?.monthlySales)} />
          <StatCard icon={<Navigation />} tone="info" label="Distance Today" value={formatKm(distanceKm)} />
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
