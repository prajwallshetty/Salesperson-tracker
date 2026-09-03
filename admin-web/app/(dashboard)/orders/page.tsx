"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { SelectField } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { IconOrders } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Order } from "@/types";

const STATUSES = ["CONFIRMED", "DELIVERED", "CANCELLED"];

export default function OrdersListPage() {
  const salespersons = useSalespersonOptions();
  const [salespersonId, setSalespersonId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/orders", {
        params: {
          salespersonId: salespersonId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load orders")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [salespersonId, from, to]);

  const filtered = status ? items.filter((o) => o.status === status) : items;

  const updateStatus = async (o: Order, next: string) => {
    try {
      await api.patch(`/orders/${o.id}/status`, { status: next });
      toast.success(`Order marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update order status"));
    }
  };

  const total = filtered.reduce((sum, o) => sum + o.grandTotal, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Orders</h1>
          <p className="text-sm text-slate-400">All orders placed across the sales team.</p>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm">
            <span className="text-brand-500">Total: </span>
            <span className="font-semibold text-brand-700">{formatCurrency(total)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SelectField value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto max-w-[170px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <SelectField value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} className="w-auto max-w-[190px]">
          <option value="">All salespersons</option>
          {salespersons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.user.name}
            </option>
          ))}
        </SelectField>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        <span className="text-sm text-slate-400">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
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
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <EmptyState icon={<IconOrders className="h-6 w-6" />} title="No orders found" message="Orders placed by the sales team will appear here." />
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{o.number}</td>
                    <td className="px-4 py-3 text-slate-500">{o.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{o.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(o.grandTotal)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(o.amountCollected)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-brand-400"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
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
