import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../../lib/api";
import { SelectField } from "../../components/FormField";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRow } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/format";
import { IconFollowUp, IconCheck } from "../../components/icons";
import { useSalespersonOptions } from "../../hooks/useSalespersonOptions";
import type { FollowUp } from "../../types";

const STATUSES = ["PENDING", "OVERDUE", "COMPLETED", "CANCELLED"];

export default function FollowupsList() {
  const salespersons = useSalespersonOptions();
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/followups", { params: { status: status || undefined, salespersonId: salespersonId || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load follow-ups")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId]);

  const filtered = useMemo(
    () =>
      items.filter((f) => {
        if (from && new Date(f.dueDate) < new Date(from)) return false;
        if (to && new Date(f.dueDate) > new Date(to + "T23:59:59")) return false;
        return true;
      }),
    [items, from, to]
  );

  const complete = async (f: FollowUp) => {
    try {
      await api.patch(`/followups/${f.id}/complete`);
      toast.success("Follow-up marked completed");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to complete follow-up"));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Follow-ups</h1>
        <p className="text-sm text-slate-400">Track pending and completed follow-ups across the team.</p>
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
                <th className="px-4 py-3 font-medium">For</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Notes</th>
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
                    <EmptyState icon={<IconFollowUp className="h-6 w-6" />} title="No follow-ups found" message="Follow-ups created by the field team will appear here." />
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{f.customer?.name ?? f.lead?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{f.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(f.dueDate)}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">{f.notes ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.status === "PENDING" && (
                        <button
                          onClick={() => complete(f)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <IconCheck className="h-3.5 w-3.5" /> Complete
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
