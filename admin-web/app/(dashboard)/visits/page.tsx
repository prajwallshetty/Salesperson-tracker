"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { SelectField } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { IconRoute } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Visit } from "@/types";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const OUTCOME_LABEL: Record<string, string> = {
  ORDER_PLACED: "Order Placed",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  NOT_INTERESTED: "Not Interested",
  NO_RESPONSE: "No Response",
  PAYMENT_COLLECTED: "Payment Collected",
  OTHER: "Other",
};

export default function VisitsListPage() {
  const salespersons = useSalespersonOptions();
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/visits", {
        params: {
          status: status || undefined,
          salespersonId: salespersonId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load visits")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId, from, to]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Visits</h1>
        <p className="text-sm text-slate-400">Monitor field visits across your entire sales team.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SelectField value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto max-w-[170px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
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
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Check-out</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState icon={<IconRoute className="h-6 w-6" />} title="No visits found" message="Field visits logged by the sales team will appear here." />
                  </td>
                </tr>
              ) : (
                items.map((v) => (
                  <tr key={v.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{v.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{v.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{v.checkInAt ? formatDateTime(v.checkInAt) : "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{v.checkOutAt ? formatDateTime(v.checkOutAt) : "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{v.outcome ? OUTCOME_LABEL[v.outcome] ?? v.outcome : "-"}</td>
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
