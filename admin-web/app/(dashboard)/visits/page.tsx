"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { IconRoute } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Visit } from "@/types";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);

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
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(t);
  }, [status, salespersonId, from, to]);

  // Visits has no server-side pagination (see API_CONTRACT.md), so paginate
  // the fetched array client-side to avoid rendering hundreds of rows at once.
  const pageItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Visits" description="Monitor field visits across your entire sales team." />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
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
            <TableHead>Customer</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<IconRoute className="size-5" />} title="No visits found" message="Field visits logged by the sales team will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium text-foreground">{v.customer?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{v.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{v.checkInAt ? formatDateTime(v.checkInAt) : "-"}</TableCell>
                <TableCell className="text-muted-foreground">{v.checkOutAt ? formatDateTime(v.checkOutAt) : "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={v.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{v.outcome ? OUTCOME_LABEL[v.outcome] ?? v.outcome : "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {!loading && items.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
      )}
    </div>
  );
}
