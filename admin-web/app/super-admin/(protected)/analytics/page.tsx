"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Skeleton } from "@/components/Skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import { TrendingUp, Building2, XCircle } from "lucide-react";
import type { PlatformAnalytics } from "@/types";

export default function SuperAdminAnalyticsPage() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi
      .get("/analytics")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load analytics")))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Analytics" description="Revenue and growth, from real database records." />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Revenue and growth, from real database records." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="MRR (estimate)" value={formatCurrency(data.revenue.mrr)} icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
        <KpiCard label="New tenants (30d)" value={formatNumber(data.newTenantsLast30d)} icon={<Building2 className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
        <KpiCard label="Cancellations (30d)" value={formatNumber(data.cancellationsLast30d)} icon={<XCircle className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-danger" />
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="mb-1 text-sm font-semibold text-foreground">Captured payment revenue by month</p>
          <p className="mb-4 text-xs text-muted-foreground">{data.revenueByMonthNote}</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(240 18% 90%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? Math.round(v / 1000) + "k" : v}`} width={48} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" name="Revenue" fill="hsl(262 83% 58%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Tenant growth by month</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.tenantGrowthByMonth}>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(240 18% 90%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="New tenants" stroke="hsl(262 83% 58%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Subscriptions by plan</p>
            <div className="space-y-2">
              {data.subscriptionsByPlan.map((p) => (
                <div key={p.planKey} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{p.planName}</span>
                  <span className="font-semibold text-foreground">{p.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Subscriptions by status</p>
            <div className="space-y-2">
              {data.subscriptionsByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.status}</span>
                  <span className="font-semibold text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
