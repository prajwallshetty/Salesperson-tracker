"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Avatar } from "@/components/Avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <PageHeader title="Customers" description="All customers across your sales territories." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, address..." className="w-full max-w-xs" />
        <FilterSelect value={territoryId} onChange={setTerritoryId} placeholder="All territories" options={territories.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect
          value={salespersonId}
          onChange={setSalespersonId}
          placeholder="All salespersons"
          options={salespersons.map((s) => ({ value: s.id, label: s.user.name }))}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Territory</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState icon={<UserCheck className="size-5" />} title="No customers found" message="Try adjusting your filters." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{c.territory?.name ?? "Unassigned"}</TableCell>
                <TableCell className="text-muted-foreground">{c.salesperson?.user?.name ?? "Unassigned"}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{c.address ?? "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
