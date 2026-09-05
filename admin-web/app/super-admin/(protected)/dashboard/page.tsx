"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Users, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/Skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { PlatformDashboardStats } from "@/types";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<PlatformDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi
      .get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load dashboard stats")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Platform-wide overview across every tenant." />

      {loading || !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total tenants" value={formatNumber(stats.tenants.total)} sub={`${stats.tenants.newLast30d} new in last 30d`} icon={<Building2 className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
            <KpiCard label="Active tenants" value={formatNumber(stats.tenants.active)} sub={`${stats.tenants.suspended} suspended`} icon={<Building2 className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
            <KpiCard label="Trial subscriptions" value={formatNumber(stats.subscriptions.trialing)} icon={<Clock className="size-5" />} iconBg="bg-pastel-violet" iconColor="text-primary" />
            <KpiCard label="Past-due subscriptions" value={formatNumber(stats.subscriptions.pastDue)} icon={<AlertTriangle className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-warning" />
            <KpiCard label="Total salespeople" value={formatNumber(stats.salespersons.total)} icon={<Users className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
            <KpiCard label="MRR (estimate)" value={formatCurrency(stats.revenue.mrr)} sub="Active + past-due subscriptions" icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
            <KpiCard label="ARR (estimate)" value={formatCurrency(stats.revenue.arr)} icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
            <KpiCard label="Failed payments (30d)" value={formatNumber(stats.failedPaymentsLast30d)} icon={<AlertTriangle className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-danger" />
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Subscriptions by status</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(
                  [
                    ["Trialing", stats.subscriptions.trialing],
                    ["Active", stats.subscriptions.active],
                    ["Past due", stats.subscriptions.pastDue],
                    ["Cancelled", stats.subscriptions.cancelled],
                    ["Expired", stats.subscriptions.expired],
                    ["Suspended", stats.subscriptions.suspended],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{formatNumber(value)}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{stats.revenue.note}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
