"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Eye, Pencil, Power, Users, UserCheck, MapPinned, UserX } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatNumber } from "@/lib/format";
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
  const [statsItems, setStatsItems] = useState<Salesperson[]>([]);

  useEffect(() => {
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
  }, []);

  const loadStats = () => {
    api
      .get("/salespersons", { params: { pageSize: 1000 } })
      .then((res) => setStatsItems(res.data.items ?? []))
      .catch(() => setStatsItems([]));
  };
  useEffect(loadStats, []);

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

  useEffect(load, [search, status, territoryId, page]);

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
      loadStats();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update status"));
    }
  };

  const stats = useMemo(() => {
    return {
      total: statsItems.length,
      active: statsItems.filter((s) => s.status === "ACTIVE").length,
      onField: statsItems.filter((s) => s.fieldWorkStatus === "ACTIVE").length,
      offline: statsItems.filter((s) => !s.isOnline).length,
    };
  }, [statsItems]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salespersons"
        description="Manage your field sales team."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus /> Add Salesperson
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip icon={<Users className="size-4" />} label="Total" value={formatNumber(stats.total)} bg="bg-pastel-violet" color="text-primary" />
        <StatChip icon={<UserCheck className="size-4" />} label="Active" value={formatNumber(stats.active)} bg="bg-pastel-green" color="text-success" />
        <StatChip icon={<MapPinned className="size-4" />} label="On Field" value={formatNumber(stats.onField)} bg="bg-pastel-blue" color="text-info" />
        <StatChip icon={<UserX className="size-4" />} label="Offline" value={formatNumber(stats.offline)} bg="bg-muted" color="text-muted-foreground" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, employee code..." className="w-full max-w-xs" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
        <FilterSelect
          value={territoryId}
          onChange={setTerritoryId}
          placeholder="All territories"
          options={territories.map((t) => ({ value: t.id, label: t.name }))}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Salesperson</TableHead>
            <TableHead>Employee Code</TableHead>
            <TableHead>Territory</TableHead>
            <TableHead className="text-right">Customers</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<Users className="size-5" />} title="No salespersons found" message="Try adjusting your filters or add a new salesperson." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((sp) => (
              <TableRow key={sp.id}>
                <TableCell>
                  <button onClick={() => router.push(`/salespersons/${sp.id}`)} className="flex items-center gap-3 text-left">
                    <Avatar name={sp.user.name} src={sp.user.avatarUrl} online={sp.isOnline} size="sm" />
                    <div>
                      <p className="font-medium text-foreground">{sp.user.name}</p>
                      <p className="text-xs text-muted-foreground">{sp.user.email}</p>
                    </div>
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{sp.employeeCode}</TableCell>
                <TableCell className="text-muted-foreground">{sp.territory?.name ?? "Unassigned"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatNumber(sp._count?.customers ?? 0)}</TableCell>
                <TableCell>
                  <StatusBadge status={sp.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => router.push(`/salespersons/${sp.id}`)}>
                        <Eye /> View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEditing(sp)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive={sp.status === "ACTIVE"} onSelect={() => setToggling(sp)}>
                        <Power /> {sp.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <AddSalespersonModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          load();
          loadStats();
        }}
      />
      <EditSalespersonModal
        open={!!editing}
        salesperson={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          load();
          loadStats();
        }}
      />
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

function StatChip({ icon, label, value, bg, color }: { icon: React.ReactNode; label: string; value: string; bg: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
