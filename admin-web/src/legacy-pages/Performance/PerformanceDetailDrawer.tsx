import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Drawer } from "../../components/Drawer";
import { Skeleton } from "../../components/Skeleton";
import { api, apiErrorMessage } from "../../lib/api";
import { formatCurrency, formatNumber } from "../../lib/format";
import type { PerformanceDetail } from "../../types";

interface PerformanceDetailDrawerProps {
  salespersonId: string | null;
  name?: string;
  onClose: () => void;
}

export function PerformanceDetailDrawer({ salespersonId, name, onClose }: PerformanceDetailDrawerProps) {
  const [data, setData] = useState<PerformanceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!salespersonId) return;
    setLoading(true);
    api
      .get(`/performance/${salespersonId}`)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load performance detail")))
      .finally(() => setLoading(false));
  }, [salespersonId]);

  return (
    <Drawer open={!!salespersonId} onClose={onClose} title={name ?? "Performance"} subtitle="Detailed performance breakdown" width="max-w-xl">
      {loading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Target vs Achievement</p>
              <span className="text-sm font-semibold text-brand-600">{data.achievementPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, data.achievementPercent)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {formatCurrency(data.monthlySales)} of {formatCurrency(data.targetAmount)} target
            </p>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { period: "Daily", sales: data.dailySales },
                { period: "Weekly", sales: data.weeklySales },
                { period: "Monthly", sales: data.monthlySales },
              ]}
              margin={{ left: -18, right: 10, top: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="sales" fill="#3d63f5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Monthly Orders" value={formatNumber(data.monthlyOrders)} />
            <Stat label="Monthly Visits" value={formatNumber(data.monthlyVisits)} />
            <Stat label="New Customers" value={formatNumber(data.newCustomers)} />
            <Stat label="Follow-ups Completed" value={formatNumber(data.followUpsCompleted)} />
            <Stat label="Monthly Collections" value={formatCurrency(data.monthlyCollections)} />
            <Stat label="Distance Travelled" value={`${data.totalDistanceKm.toFixed(1)} km`} />
            <Stat label="Working Hours" value={`${data.workingHours.toFixed(1)} h`} />
            <Stat label="Avg Order Value" value={formatCurrency(data.avgOrderValue)} />
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
