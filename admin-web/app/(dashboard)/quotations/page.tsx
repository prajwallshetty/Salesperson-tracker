"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileCheck2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { IconQuote } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Quotation } from "@/types";

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];

export default function QuotationsListPage() {
  const salespersons = useSalespersonOptions();
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get("/quotations", { params: { status: status || undefined, salespersonId: salespersonId || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load quotations")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId]);

  const filtered = useMemo(
    () =>
      items.filter((q) => {
        if (from && new Date(q.createdAt) < new Date(from)) return false;
        if (to && new Date(q.createdAt) > new Date(to + "T23:59:59")) return false;
        return true;
      }),
    [items, from, to]
  );

  const updateStatus = async (q: Quotation, next: string) => {
    try {
      await api.patch(`/quotations/${q.id}/status`, { status: next });
      toast.success(`Quotation marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update quotation status"));
    }
  };

  const convertToOrder = async (q: Quotation) => {
    setBusyId(q.id);
    try {
      await api.post(`/quotations/${q.id}/convert`);
      toast.success("Converted to order");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to convert quotation"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Quotations" description="Track quotations raised by the field team." />

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
            <TableHead>Customer</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Total</TableHead>
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
                <EmptyState icon={<IconQuote className="size-5" />} title="No quotations found" message="Quotations created by salespersons will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium text-foreground">{q.customer?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{q.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(q.createdAt)}</TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(q.grandTotal)}</TableCell>
                <TableCell>
                  {STATUSES.includes(q.status) ? (
                    <Select value={q.status} onValueChange={(v) => updateStatus(q, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs">
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
                  ) : (
                    <StatusBadge status={q.status} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {q.status === "ACCEPTED" && (
                    <Button variant="outline" size="sm" disabled={busyId === q.id} loading={busyId === q.id} onClick={() => convertToOrder(q)}>
                      <FileCheck2 /> Convert to Order
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
