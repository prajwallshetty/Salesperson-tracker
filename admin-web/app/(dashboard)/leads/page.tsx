"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import type { Lead } from "@/types";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "CONVERTED", "LOST"];

export default function LeadsListPage() {
  const salespersons = useSalespersonOptions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/leads", { params: { status: status || undefined, salespersonId: salespersonId || undefined, search: search || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load leads")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, salespersonId, search]);

  const filtered = useMemo(() => {
    return items.filter((l) => {
      if (from && new Date(l.createdAt) < new Date(from)) return false;
      if (to && new Date(l.createdAt) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [items, from, to]);

  const updateStatus = async (lead: Lead, next: string) => {
    try {
      await api.patch(`/leads/${lead.id}`, { status: next });
      toast.success(`Lead marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update lead status"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Leads" description="Monitor leads captured by your field team." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, company..." className="w-full max-w-xs" />
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))} />
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
            <TableHead>Lead</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState icon={<Flame className="size-5" />} title="No leads found" message="Leads created by salespersons in the field will appear here." />
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.company ?? l.phone ?? "-"}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.salesperson?.user?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{l.source ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                <TableCell>
                  <Select value={l.status} onValueChange={(v) => updateStatus(l, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
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
    </div>
  );
}
