"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, CreditCard, RotateCcw, ArrowUpRight, ArrowDownRight, XCircle, PlusCircle } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/Skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { PlatformRevenue } from "@/types";

export default function SuperAdminRevenuePage() {
  const [data, setData] = useState<PlatformRevenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi
      .get("/revenue")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load revenue")))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Revenue" description="Real collected payments and recurring-revenue estimates." />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" description="Real collected payments and recurring-revenue estimates - never the same number." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="MRR (estimate)" value={formatCurrency(data.mrr)} sub="From active/past-due subscriptions" icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
        <KpiCard label="ARR (estimate)" value={formatCurrency(data.arr)} icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
        <KpiCard label="This month (collected)" value={formatCurrency(data.thisMonthRevenue)} sub="Captured payments" icon={<CreditCard className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
        <KpiCard label="Last month (collected)" value={formatCurrency(data.lastMonthRevenue)} icon={<CreditCard className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Gross revenue (12mo)" value={formatCurrency(data.grossRevenueLast12mo)} icon={<TrendingUp className="size-5" />} iconBg="bg-pastel-violet" iconColor="text-primary" />
        <KpiCard label="Successful payments" value={formatNumber(data.successfulPayments)} icon={<CreditCard className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
        <KpiCard label="Failed payments" value={formatNumber(data.failedPayments)} icon={<TrendingDown className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-danger" />
        <KpiCard label="Refunds" value={formatNumber(data.refunds)} icon={<RotateCcw className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="New subscriptions (30d)" value={formatNumber(data.newSubscriptionsLast30d)} icon={<PlusCircle className="size-5" />} iconBg="bg-pastel-blue" iconColor="text-info" />
        <KpiCard label="Upgrades (30d)" value={formatNumber(data.upgradesLast30d)} icon={<ArrowUpRight className="size-5" />} iconBg="bg-pastel-green" iconColor="text-success" />
        <KpiCard label="Downgrades (30d)" value={formatNumber(data.downgradesLast30d)} icon={<ArrowDownRight className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-warning" />
        <KpiCard label="Cancellations (30d)" value={formatNumber(data.cancellationsLast30d)} icon={<XCircle className="size-5" />} iconBg="bg-pastel-amber" iconColor="text-danger" />
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="mb-1 text-sm font-semibold text-foreground">Collected revenue by month</p>
          <p className="mb-4 text-xs text-muted-foreground">Sum of captured-payment webhook amounts per month, last 12 months.</p>
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
          <p className="mb-3 text-sm font-semibold text-foreground">MRR by plan</p>
          <div className="space-y-2">
            {data.revenueByPlan.map((p) => (
              <div key={p.planKey} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{p.planName}</span>
                <span className="font-semibold text-foreground">{formatCurrency(p.mrr)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{data.note}</p>
    </div>
  );
}
