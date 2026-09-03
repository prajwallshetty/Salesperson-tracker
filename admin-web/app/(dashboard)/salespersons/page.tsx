"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { SearchInput } from "@/components/SearchInput";
import { Pagination } from "@/components/Pagination";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SelectField } from "@/components/FormField";
import { IconEdit, IconEye, IconPlus, IconPower } from "@/components/icons";
import { AddSalespersonModal } from "@/components/salespersons/AddSalespersonModal";
import { EditSalespersonModal } from "@/components/salespersons/EditSalespersonModal";
import type { Paginated, Salesperson, Territory } from "@/types";

const PAGE_SIZE = 10;

export default function SalespersonsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [page, setPage] = useState(1);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [data, setData] = useState<Paginated<Salesperson> | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Salesperson | null>(null);
  const [toggling, setToggling] = useState<Salesperson | null>(null);

  useEffect(() => {
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(t);
  }, [search, status, territoryId]);

  const load = () => {
    setLoading(true);
    api
      .get("/salespersons", {
        params: {
          search: search || undefined,
          status: status || undefined,
          territoryId: territoryId || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load salespersons")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, territoryId, page]);

  useEffect(() => {
    if (search) router.replace(`/salespersons?search=${encodeURIComponent(search)}`);
    else router.replace("/salespersons");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggleStatus = async (sp: Salesperson) => {
    const next = sp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/salespersons/${sp.id}/status`, { status: next });
      toast.success(`${sp.user.name} marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update status"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Salespersons</h1>
          <p className="text-sm text-slate-400">Manage your field sales team.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" /> Add Salesperson
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, employee code..." className="w-full max-w-xs" />
        <SelectField value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto max-w-[160px]">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </SelectField>
        <SelectField value={territoryId} onChange={(e) => setTerritoryId(e.target.value)} className="w-auto max-w-[180px]">
          <option value="">All territories</option>
          {territories.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Employee Code</th>
                <th className="px-4 py-3 font-medium">Territory</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Customers</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState title="No salespersons found" message="Try adjusting your filters or add a new salesperson." />
                  </td>
                </tr>
              ) : (
                data.items.map((sp) => (
                  <tr key={sp.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/salespersons/${sp.id}`)}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar name={sp.user.name} src={sp.user.avatarUrl} online={sp.isOnline} size="sm" />
                        <div>
                          <p className="font-medium text-slate-700">{sp.user.name}</p>
                          <p className="text-xs text-slate-400">{sp.user.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{sp.employeeCode}</td>
                    <td className="px-4 py-3 text-slate-500">{sp.territory?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sp.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{sp._count?.customers ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/salespersons/${sp.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="View profile"
                        >
                          <IconEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(sp)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToggling(sp)}
                          className={`rounded-lg p-2 transition hover:bg-slate-100 ${
                            sp.status === "ACTIVE" ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"
                          }`}
                          title={sp.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        >
                          <IconPower className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )}
      </div>

      <AddSalespersonModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
      <EditSalespersonModal open={!!editing} salesperson={editing} onClose={() => setEditing(null)} onSaved={load} />
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.status === "ACTIVE" ? "Deactivate salesperson?" : "Activate salesperson?"}
        message={
          toggling
            ? `This will mark ${toggling.user.name} as ${toggling.status === "ACTIVE" ? "inactive" : "active"}.`
            : ""
        }
        tone={toggling?.status === "ACTIVE" ? "danger" : "brand"}
        confirmLabel={toggling?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        onClose={() => setToggling(null)}
        onConfirm={() => (toggling ? toggleStatus(toggling) : undefined)}
      />
    </div>
  );
}
