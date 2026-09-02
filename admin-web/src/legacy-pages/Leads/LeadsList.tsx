import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../../lib/api";
import { SearchInput } from "../../components/SearchInput";
import { SelectField } from "../../components/FormField";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRow } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/format";
import { IconLeads } from "../../components/icons";
import { useSalespersonOptions } from "../../hooks/useSalespersonOptions";
import type { Lead } from "../../types";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "CONVERTED", "LOST"];

export default function LeadsList() {
  const salespersons = useSalespersonOptions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/leads", { params: { status: status || undefined, salespersonId: salespersonId || undefined, search: search || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load leads")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId, search]);

  const filtered = useMemo(() => {
    return items.filter((l) => {
      if (from && new Date(l.createdAt) < new Date(from)) return false;
      if (to && new Date(l.createdAt) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [items, from, to]);

  const updateStatus = async (lead: Lead, next: string) => {
    try {
      await api.patch(`/leads/${lead.id}`, { status: next });
      toast.success(`Lead marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update lead status"));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Leads</h1>
        <p className="text-sm text-slate-400">Monitor leads captured by your field team.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, company..." className="w-full max-w-xs" />
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
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState icon={<IconLeads className="h-6 w-6" />} title="No leads found" message="Leads created by salespersons in the field will appear here." />
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{l.name}</p>
                      <p className="text-xs text-slate-400">{l.company ?? l.phone ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{l.salesperson?.user?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{l.source ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={l.status}
                        onChange={(e) => updateStatus(l, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-brand-400"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
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
