"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Users, AlertTriangle, TrendingUp, Clock, CalendarClock, CreditCard } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { formatCurrency, formatNumber, formatDate, formatDateTime } from "@/lib/format";
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
            <KpiCard label="MRR" value={formatCurrency(stats.revenue.mrr)} sub="Active + past-due subscriptions" icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
            <KpiCard label="ARR" value={formatCurrency(stats.revenue.arr)} icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
            <KpiCard label="This month revenue" value={formatCurrency(stats.revenue.thisMonth)} sub="Actual captured payments" icon={<CreditCard className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
            <KpiCard label="Last month revenue" value={formatCurrency(stats.revenue.lastMonth)} icon={<CreditCard className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total tenants" value={formatNumber(stats.tenants.total)} sub={`${stats.tenants.newLast30d} new in last 30d`} icon={<Building2 className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
            <KpiCard label="Active tenants" value={formatNumber(stats.tenants.active)} sub={`${stats.tenants.suspended} suspended`} icon={<Building2 className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
            <KpiCard label="Trial tenants" value={formatNumber(stats.tenants.trial)} icon={<Clock className="size-5" />} iconBg="bg-pastel-violet" iconColor="text-primary" />
            <KpiCard label="Past due" value={formatNumber(stats.tenants.pastDue)} icon={<AlertTriangle className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-warning" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total users" value={formatNumber(stats.users.total)} icon={<Users className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
            <KpiCard label="Total salespeople" value={formatNumber(stats.salespersons.total)} icon={<Users className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
            <KpiCard label="Suspended tenants" value={formatNumber(stats.tenants.suspended)} icon={<AlertTriangle className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-danger" />
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Upcoming renewals (next 30 days)</p>
                {stats.upcomingRenewals.length === 0 ? (
                  <EmptyState icon={<CalendarClock className="size-5" />} title="Nothing renewing soon" message="No subscriptions renew in the next 30 days." />
                ) : (
                  <div className="space-y-3">
                    {stats.upcomingRenewals.map((r) => (
                      <Link
                        key={r.tenantId}
                        href={`/super-admin/tenants/${r.tenantId}`}
                        className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.tenantName}</p>
                          <p className="text-xs text-muted-foreground">{r.planName} · {formatDate(r.renewalDate)}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(r.amount)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Recent failed payments</p>
                {stats.recentFailedPayments.length === 0 ? (
                  <EmptyState icon={<AlertTriangle className="size-5" />} title="No failed payments" message="No payment failures recorded." />
                ) : (
                  <div className="space-y-3">
                    {stats.recentFailedPayments.map((p) => (
                      <div key={p.billingEventId} className="flex items-center justify-between px-2 py-1.5">
                        <div>
                          {p.tenantId ? (
                            <Link href={`/super-admin/tenants/${p.tenantId}`} className="text-sm font-medium text-foreground hover:underline">
                              {p.tenantName ?? p.tenantId}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-foreground">Unknown tenant</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.amount != null && <span className="text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</span>}
                          <Badge variant="danger">Failed</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
