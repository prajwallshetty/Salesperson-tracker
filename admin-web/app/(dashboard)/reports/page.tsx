"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { IconChart, IconOrders, IconWallet } from "@/components/icons";
import type { Collection, Order, PerformanceLeaderboardRow } from "@/types";

type ReportTab = "sales" | "performance" | "collections";

const TABS: { key: ReportTab; label: string; icon: typeof IconChart }[] = [
  { key: "sales", label: "Sales Report", icon: IconOrders },
  { key: "performance", label: "Performance Report", icon: IconChart },
  { key: "collections", label: "Collections Report", icon: IconWallet },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("sales");

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Composed views over sales, performance, and collections data." />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              <t.icon className="size-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "sales" && <SalesReport />}
      {tab === "performance" && <PerformanceReport />}
      {tab === "collections" && <CollectionsReport />}
    </div>
  );
}

function RangeToggle({
  ranges,
  value,
  onChange,
}: {
  ranges: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {ranges.map((r) => (
          <TabsTrigger key={r.key} value={r.key}>
            {r.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function SalesReport() {
  const [range, setRange] = useState<"today" | "month">("month");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/dashboard/orders", { params: { range } })
      .then((res) => setOrders(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load sales report")))
      .finally(() => setLoading(false));
  }, [range]);

  const totalSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCollected = orders.reduce((sum, o) => sum + o.amountCollected, 0);
  const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Orders {range === "today" ? "placed today" : "placed this month"}, from live order data.
        </p>
        <RangeToggle
          ranges={[
            { key: "today", label: "Today" },
            { key: "month", label: "This Month" },
          ]}
          value={range}
          onChange={(v) => setRange(v as "today" | "month")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Sales" value={formatCurrency(totalSales)} />
        <StatCard label="Orders" value={formatNumber(orders.length)} />
        <StatCard label="Avg Order Value" value={formatCurrency(avgOrderValue)} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Collected</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : orders.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState icon={<IconOrders className="size-5" />} title="No orders in this period" />
              </TableCell>
            </TableRow>
          ) : (
            orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium text-foreground">{o.number}</TableCell>
                <TableCell className="text-muted-foreground">{o.customer?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{o.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(o.grandTotal)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(o.amountCollected)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <p className="text-right text-xs text-muted-foreground">Total collected in period: {formatCurrency(totalCollected)}</p>
    </div>
  );
}

function PerformanceReport() {
  const [range, setRange] = useState<"today" | "week" | "month">("month");
  const [items, setItems] = useState<PerformanceLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/performance", { params: { range } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load performance report")))
      .finally(() => setLoading(false));
  }, [range]);

  const totalSales = items.reduce((sum, r) => sum + r.sales, 0);
  const totalOrders = items.reduce((sum, r) => sum + r.orders, 0);
  const totalVisits = items.reduce((sum, r) => sum + r.visits, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Team performance ranked by sales, from the live leaderboard.</p>
        <RangeToggle
          ranges={[
            { key: "today", label: "Today" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
          ]}
          value={range}
          onChange={(v) => setRange(v as "today" | "week" | "month")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Team Sales" value={formatCurrency(totalSales)} />
        <StatCard label="Team Orders" value={formatNumber(totalOrders)} />
        <StatCard label="Team Visits" value={formatNumber(totalVisits)} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Visits</TableHead>
            <TableHead className="text-right">Collections</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<IconChart className="size-5" />} title="No performance data for this period" />
              </TableCell>
            </TableRow>
          ) : (
            items.map((row) => (
              <TableRow key={row.salespersonId}>
                <TableCell className="text-muted-foreground">{row.rank}</TableCell>
                <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(row.sales)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatNumber(row.orders)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatNumber(row.visits)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(row.collections)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CollectionsReport() {
  const [range, setRange] = useState<"today" | "month">("month");
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/dashboard/collections", { params: { range } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load collections report")))
      .finally(() => setLoading(false));
  }, [range]);

  const total = items.reduce((sum, c) => sum + c.amount, 0);
  const byMethod = items.reduce<Record<string, number>>((acc, c) => {
    acc[c.method] = (acc[c.method] ?? 0) + c.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Payments collected in the period, broken down by method.</p>
        <RangeToggle
          ranges={[
            { key: "today", label: "Today" },
            { key: "month", label: "This Month" },
          ]}
          value={range}
          onChange={(v) => setRange(v as "today" | "month")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Collected" value={formatCurrency(total)} />
        <StatCard label="Transactions" value={formatNumber(items.length)} />
        <StatCard
          label="Top Method"
          value={Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") ?? "-"}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState icon={<IconWallet className="size-5" />} title="No collections in this period" />
              </TableCell>
            </TableRow>
          ) : (
            items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-foreground">{c.customer?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{c.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{c.method.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(c.collectedAt)}</TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(c.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
