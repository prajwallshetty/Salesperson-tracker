import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { api, apiErrorMessage } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRow } from "../../components/Skeleton";
import { formatCurrency, formatNumber } from "../../lib/format";
import { IconChart } from "../../components/icons";
import { PerformanceDetailDrawer } from "./PerformanceDetailDrawer";
import type { PerformanceLeaderboardRow } from "../../types";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export default function Performance() {
  const [range, setRange] = useState("month");
  const [items, setItems] = useState<PerformanceLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PerformanceLeaderboardRow | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/performance", { params: { range } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load leaderboard")))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Performance Leaderboard</h1>
          <p className="text-sm text-slate-400">Compare salesperson performance across periods.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                range === r.key ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
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
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState icon={<IconChart className="h-6 w-6" />} title="No performance data" message="Data will appear once field activity is recorded for this period." />
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.salespersonId}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                          row.rank === 1
                            ? "bg-amber-100 text-amber-700"
                            : row.rank === 2
                            ? "bg-slate-200 text-slate-600"
                            : row.rank === 3
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                        <span className="font-medium text-slate-700">{row.name}</span>
                      </div>
                    </td>
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

      <PerformanceDetailDrawer
        salespersonId={selected?.salespersonId ?? null}
        name={selected?.name}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
