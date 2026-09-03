"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { IconFollowUp } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { FollowUp } from "@/types";

const STATUSES = ["PENDING", "OVERDUE", "COMPLETED", "CANCELLED"];
const PAGE_SIZE = 10;

export default function FollowUpsListPage() {
  const salespersons = useSalespersonOptions();
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    api
      .get("/followups", { params: { status: status || undefined, salespersonId: salespersonId || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load follow-ups")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId]);
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(t);
  }, [status, salespersonId, from, to]);

  // Follow-ups has no server-side pagination (see API_CONTRACT.md), so
  // paginate the fetched+filtered array client-side.
  const filtered = useMemo(
    () =>
      items.filter((f) => {
        if (from && new Date(f.dueDate) < new Date(from)) return false;
        if (to && new Date(f.dueDate) > new Date(to + "T23:59:59")) return false;
        return true;
      }),
    [items, from, to]
  );
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const complete = async (f: FollowUp) => {
    setBusyId(f.id);
    try {
      await api.patch(`/followups/${f.id}/complete`);
      toast.success("Follow-up marked completed");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to complete follow-up"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Follow-ups" description="Track pending and completed follow-ups across the team." />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          value={salespersonId}
          onChange={setSalespersonId}
          placeholder="All salespersons"
          options={salespersons.map((s) => ({ value: s.id, label: s.user.name }))}
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <span className="text-sm text-muted-foreground">to</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>For</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<IconFollowUp className="size-5" />} title="No follow-ups found" message="Follow-ups created by the field team will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-foreground">{f.customer?.name ?? f.lead?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{f.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(f.dueDate)}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{f.notes ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={f.status} />
                </TableCell>
                <TableCell className="text-right">
                  {f.status === "PENDING" && (
                    <Button variant="outline" size="sm" disabled={busyId === f.id} loading={busyId === f.id} onClick={() => complete(f)}>
                      <Check /> Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {!loading && filtered.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      )}
    </div>
  );
}
