"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Target as TargetIcon } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TargetEditModal } from "@/components/targets/TargetEditModal";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import { useTerritoryOptions } from "@/hooks/useTerritoryOptions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AdminTargetRow, Paginated } from "@/types";
import type { Order } from "@/types";

const PAGE_SIZE = 10;

export default function TargetsListPage() {
  const salespersons = useSalespersonOptions();
  const territories = useTerritoryOptions();
  const [salespersonId, setSalespersonId] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [period, setPeriod] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminTargetRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // GET /api/targets doesn't return achievement/percent (see API_CONTRACT.md) - computed
  // here from real order totals within each target's own period window, keyed by target id.
  const [achieved, setAchieved] = useState<Record<string, number>>({});
  const [achievedLoading, setAchievedLoading] = useState(false);
  const [editing, setEditing] = useState<AdminTargetRow | null>(null);
  const [deleting, setDeleting] = useState<AdminTargetRow | null>(null);

  useEffect(() => setPage(1), [salespersonId, territoryId, period]);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/targets", {
        params: {
          salespersonId: salespersonId || undefined,
          territoryId: territoryId || undefined,
          period: period || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => {
        const result: Paginated<AdminTargetRow> = res.data;
        setData(result);
        loadAchievements(result.items);
      })
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load targets"));
      })
      .finally(() => setLoading(false));
  };

  const loadAchievements = (items: AdminTargetRow[]) => {
    setAchievedLoading(true);
    Promise.all(
      items.map((t) =>
        api
          .get<Order[]>("/orders", {
            params: { salespersonId: t.salespersonId, from: t.periodStart, to: t.periodEnd },
          })
          .then((res) => ({
            id: t.id,
            sum: (res.data ?? [])
              .filter((o) => o.status !== "CANCELLED")
              .reduce((acc, o) => acc + o.grandTotal, 0),
          }))
          .catch(() => ({ id: t.id, sum: 0 }))
      )
    )
      .then((results) => {
        setAchieved((prev) => {
          const next = { ...prev };
          results.forEach((r) => (next[r.id] = r.sum));
          return next;
        });
      })
      .finally(() => setAchievedLoading(false));
  };

  useEffect(load, [salespersonId, territoryId, period, page]);

  const deleteTarget = async (t: AdminTargetRow) => {
    try {
      await api.delete(`/targets/${t.id}`);
      toast.success("Target deleted");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete target"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Targets"
        description="Sales targets across every salesperson. Use a salesperson's profile to set a new one."
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={salespersonId}
          onChange={setSalespersonId}
          placeholder="All salespersons"
          options={salespersons.map((s) => ({ value: s.id, label: s.user.name }))}
        />
        <FilterSelect
          value={territoryId}
          onChange={setTerritoryId}
          placeholder="All territories"
          options={territories.map((t) => ({ value: t.id, label: t.name }))}
        />
        <FilterSelect
          value={period}
          onChange={setPeriod}
          placeholder="All periods"
          options={[
            { value: "DAILY", label: "Daily" },
            { value: "WEEKLY", label: "Weekly" },
            { value: "MONTHLY", label: "Monthly" },
          ]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Salesperson</TableHead>
            <TableHead>Territory</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Achieved</TableHead>
            <TableHead className="w-40">Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState
                  icon={<TargetIcon className="size-5" />}
                  title="Couldn't load targets"
                  message="Something went wrong reaching the server."
                  action={
                    <Button variant="outline" size="sm" onClick={load}>
                      Retry
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState
                  icon={<TargetIcon className="size-5" />}
                  title="No targets found"
                  message="Set a target from a salesperson's profile page to see it here."
                />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((t) => {
              const achievedAmount = achieved[t.id] ?? 0;
              const percent = t.targetAmount > 0 ? Math.min(999, Math.round((achievedAmount / t.targetAmount) * 100)) : 0;
              const remaining = Math.max(0, t.targetAmount - achievedAmount);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-foreground">{t.salespersonName}</TableCell>
                  <TableCell className="text-muted-foreground">{t.territory ?? "Unassigned"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <p className="font-medium text-foreground">{t.period}</p>
                    <p className="text-xs">
                      {formatDate(t.periodStart)} → {formatDate(t.periodEnd)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">{formatCurrency(t.targetAmount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {achievedLoading && achieved[t.id] === undefined ? "…" : formatCurrency(achievedAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(100, percent)} className="h-1.5 flex-1" />
                      <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">{percent}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(remaining)} remaining</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(t)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => setDeleting(t)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <TargetEditModal open={!!editing} target={editing} onClose={() => setEditing(null)} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete target?"
        message={deleting ? `The ${deleting.period.toLowerCase()} target for ${deleting.salespersonName} will be permanently removed.` : ""}
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? deleteTarget(deleting) : undefined)}
      />
    </div>
  );
}
