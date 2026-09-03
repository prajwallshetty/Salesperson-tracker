"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { IconRoute } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import { useTerritoryOptions } from "@/hooks/useTerritoryOptions";
import type { Customer, Paginated, Visit } from "@/types";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const OUTCOMES = ["ORDER_PLACED", "FOLLOW_UP_REQUIRED", "NOT_INTERESTED", "NO_RESPONSE", "PAYMENT_COLLECTED", "OTHER"];
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
  const territories = useTerritoryOptions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [outcome, setOutcome] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Visit> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/customers", { params: { pageSize: 500 } }).then((res) => setCustomers(res.data.items ?? res.data ?? []));
  }, []);

  useEffect(() => setPage(1), [search, status, outcome, salespersonId, territoryId, customerId, from, to]);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/visits", {
        params: {
          status: status || undefined,
          outcome: outcome || undefined,
          salespersonId: salespersonId || undefined,
          customerId: customerId || undefined,
          territoryId: territoryId || undefined,
          dateFrom: from || undefined,
          dateTo: to || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load visits"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, outcome, salespersonId, territoryId, customerId, from, to, page]);

  // The backend has no free-text search param for visits, so this filters the
  // current (already server-paginated) page by customer/salesperson name client-side —
  // a convenience on top of, not a replacement for, the server-side filters above.
  const visibleItems = (data?.items ?? []).filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.customer?.name ?? "").toLowerCase().includes(q) || (v.salesperson?.user?.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Visits" description="Monitor field visits across your entire sales team." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search this page..." className="w-full max-w-xs" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
        />
        <FilterSelect
          value={outcome}
          onChange={setOutcome}
          placeholder="All outcomes"
          options={OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABEL[o] }))}
        />
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
          value={customerId}
          onChange={setCustomerId}
          placeholder="All customers"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
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
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState
                  icon={<IconRoute className="size-5" />}
                  title="Couldn't load visits"
                  message="Something went wrong reaching the server."
                  action={
                    <Button variant="outline" size="sm" onClick={load}>
                      Retry
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : visibleItems.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<IconRoute className="size-5" />} title="No visits found" message="Field visits logged by the sales team will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            visibleItems.map((v) => (
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
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
