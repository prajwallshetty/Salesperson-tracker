"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { SelectField } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { IconQuote } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Quotation } from "@/types";

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];

export default function QuotationsListPage() {
  const salespersons = useSalespersonOptions();
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get("/quotations", { params: { status: status || undefined, salespersonId: salespersonId || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load quotations")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId]);

  const filtered = useMemo(
    () =>
      items.filter((q) => {
        if (from && new Date(q.createdAt) < new Date(from)) return false;
        if (to && new Date(q.createdAt) > new Date(to + "T23:59:59")) return false;
        return true;
      }),
    [items, from, to]
  );

  const updateStatus = async (q: Quotation, next: string) => {
    try {
      await api.patch(`/quotations/${q.id}/status`, { status: next });
      toast.success(`Quotation marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update quotation status"));
    }
  };

  const convertToOrder = async (q: Quotation) => {
    setBusyId(q.id);
    try {
      await api.post(`/quotations/${q.id}/convert`);
      toast.success("Converted to order");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to convert quotation"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Quotations</h1>
        <p className="text-sm text-slate-400">Track quotations raised by the field team.</p>
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
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState icon={<IconQuote className="h-6 w-6" />} title="No quotations found" message="Quotations created by salespersons will appear here." />
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{q.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{q.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(q.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(q.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={q.status}
                        onChange={(e) => updateStatus(q, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-brand-400"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {q.status === "ACCEPTED" && (
                        <button
                          onClick={() => convertToOrder(q)}
                          disabled={busyId === q.id}
                          className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                        >
                          {busyId === q.id ? "Converting..." : "Convert to Order"}
                        </button>
                      )}
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
