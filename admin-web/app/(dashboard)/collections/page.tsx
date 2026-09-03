"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { IconWallet } from "@/components/icons";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Collection } from "@/types";

const METHODS = ["CASH", "CHEQUE", "UPI", "BANK_TRANSFER", "CARD", "OTHER"];

export default function CollectionsListPage() {
  const salespersons = useSalespersonOptions();
  const [salespersonId, setSalespersonId] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/collections", {
        params: { salespersonId: salespersonId || undefined, from: from || undefined, to: to || undefined },
      })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load collections")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [salespersonId, from, to]);

  const filtered = useMemo(() => (method ? items.filter((c) => c.method === method) : items), [items, method]);
  const total = filtered.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Collections"
        description="Payments collected by the sales team."
        actions={
          !loading && filtered.length > 0 ? (
            <div className="rounded-xl bg-success-soft px-4 py-2 text-sm">
              <span className="text-success/70">Total: </span>
              <span className="font-semibold text-success">{formatCurrency(total)}</span>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={method}
          onChange={setMethod}
          placeholder="All methods"
          options={METHODS.map((m) => ({ value: m, label: m.replace(/_/g, " ") }))}
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
            <TableHead>Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState icon={<IconWallet className="size-5" />} title="No collections found" message="Collections recorded by the sales team will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-foreground">{c.customer?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{c.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{c.method.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(c.collectedAt)}</TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(c.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
