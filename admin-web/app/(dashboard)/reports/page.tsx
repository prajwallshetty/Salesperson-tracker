"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import clsx from "clsx";
import { api, apiErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
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
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-400">Composed views over sales, performance, and collections data.</p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
              tab === t.key ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

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
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {ranges.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            value === r.key ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
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
        <p className="text-sm text-slate-500">
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Collected</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <EmptyState icon={<IconOrders className="h-6 w-6" />} title="No orders in this period" />
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{o.number}</td>
                    <td className="px-4 py-3 text-slate-500">{o.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{o.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(o.grandTotal)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(o.amountCollected)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-right text-xs text-slate-400">Total collected in period: {formatCurrency(totalCollected)}</p>
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
        <p className="text-sm text-slate-500">Team performance ranked by sales, from the live leaderboard.</p>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium text-right">Sales</th>
                <th className="px-4 py-3 font-medium text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Visits</th>
                <th className="px-4 py-3 font-medium text-right">Collections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState icon={<IconChart className="h-6 w-6" />} title="No performance data for this period" />
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.salespersonId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{row.rank}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.sales)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatNumber(row.orders)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatNumber(row.visits)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(row.collections)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
        <p className="text-sm text-slate-500">Payments collected in the period, broken down by method.</p>
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
          value={
            Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") ?? "-"
          }
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState icon={<IconWallet className="h-6 w-6" />} title="No collections in this period" />
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{c.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.method.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(c.collectedAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(c.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
