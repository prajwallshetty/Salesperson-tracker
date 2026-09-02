import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../../lib/api";
import { SelectField } from "../../components/FormField";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRow } from "../../components/Skeleton";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { IconWallet } from "../../components/icons";
import { useSalespersonOptions } from "../../hooks/useSalespersonOptions";
import type { Collection } from "../../types";

const METHODS = ["CASH", "CHEQUE", "UPI", "BANK_TRANSFER", "CARD", "OTHER"];

export default function CollectionsList() {
  const salespersons = useSalespersonOptions();
  const [salespersonId, setSalespersonId] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/collections", {
        params: { salespersonId: salespersonId || undefined, from: from || undefined, to: to || undefined },
      })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load collections")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [salespersonId, from, to]);

  const filtered = method ? items.filter((c) => c.method === method) : items;
  const total = filtered.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Collections</h1>
          <p className="text-sm text-slate-400">Payments collected by the sales team.</p>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm">
            <span className="text-emerald-500">Total: </span>
            <span className="font-semibold text-emerald-700">{formatCurrency(total)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SelectField value={method} onChange={(e) => setMethod(e.target.value)} className="w-auto max-w-[170px]">
          <option value="">All methods</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m.replace(/_/g, " ")}
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
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState icon={<IconWallet className="h-6 w-6" />} title="No collections found" message="Collections recorded by the sales team will appear here." />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
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
