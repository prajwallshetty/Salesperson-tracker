"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SkeletonRow } from "@/components/Skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { IconOrders } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Order } from "@/types";

const STATUSES = ["CONFIRMED", "DELIVERED", "CANCELLED"];
const PAGE_SIZE = 10;

export default function OrdersListPage() {
  const salespersons = useSalespersonOptions();
  const [salespersonId, setSalespersonId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    api
      .get("/orders", {
        params: {
          salespersonId: salespersonId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load orders")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [salespersonId, from, to]);
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(t);
  }, [salespersonId, status, from, to]);

  // Orders has no server-side pagination (see API_CONTRACT.md), so paginate
  // the fetched+filtered array client-side to avoid rendering hundreds of
  // rows into the DOM at once.
  const filtered = useMemo(() => (status ? items.filter((o) => o.status === status) : items), [items, status]);
  const total = filtered.reduce((sum, o) => sum + o.grandTotal, 0);
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const updateStatus = async (o: Order, next: string) => {
    try {
      await api.patch(`/orders/${o.id}/status`, { status: next });
      toast.success(`Order marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update order status"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description="All orders placed across the sales team."
        actions={
          !loading && filtered.length > 0 ? (
            <div className="rounded-xl bg-primary-soft px-4 py-2 text-sm">
              <span className="text-primary/70">Total: </span>
              <span className="font-semibold text-primary">{formatCurrency(total)}</span>
            </div>
          ) : undefined
        }
      />

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
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Collected</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState icon={<IconOrders className="size-5" />} title="No orders found" message="Orders placed by the sales team will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium text-foreground">{o.number}</TableCell>
                <TableCell className="text-muted-foreground">{o.customer?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{o.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(o.grandTotal)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(o.amountCollected)}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
