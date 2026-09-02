"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { SearchInput } from "@/components/SearchInput";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { SelectField } from "@/components/FormField";
import { IconUsers } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Paginated, Customer, Territory } from "@/types";

const PAGE_SIZE = 10;

export default function CustomersListPage() {
  const router = useRouter();
  const salespersons = useSalespersonOptions();
  const [search, setSearch] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
  }, []);

  useEffect(() => setPage(1), [search, territoryId, salespersonId]);

  const load = () => {
    setLoading(true);
    api
      .get("/customers", {
        params: {
          search: search || undefined,
          territoryId: territoryId || undefined,
          salespersonId: salespersonId || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load customers")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, territoryId, salespersonId, page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Customers</h1>
        <p className="text-sm text-slate-400">All customers across your sales territories.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, address..." className="w-full max-w-xs" />
        <SelectField value={territoryId} onChange={(e) => setTerritoryId(e.target.value)} className="w-auto max-w-[180px]">
          <option value="">All territories</option>
          {territories.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
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
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Territory</th>
                <th className="px-4 py-3 font-medium">Salesperson</th>
                <th className="px-4 py-3 font-medium">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState icon={<IconUsers className="h-6 w-6" />} title="No customers found" message="Try adjusting your filters." />
                  </td>
                </tr>
              ) : (
                data.items.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/customers/${c.id}`)} className="text-left">
                        <p className="font-medium text-slate-700">{c.name}</p>
                        {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.territory?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.salesperson?.user?.name ?? "Unassigned"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">{c.address ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
      </div>
    </div>
  );
}
