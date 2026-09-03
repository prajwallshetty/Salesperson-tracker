"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/Skeleton";
import { api, apiErrorMessage } from "@/lib/api";
import type { Customer } from "@/types";

interface AssignCustomersModalProps {
  open: boolean;
  salespersonId: string;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignCustomersModal({ open, salespersonId, onClose, onAssigned }: AssignCustomersModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    setLoading(true);
    api
      .get("/customers", { params: { pageSize: 500 } })
      .then((res) => setCustomers(res.data.items ?? res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load customers")))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one customer");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/salespersons/${salespersonId}/assign-customers`, {
        customerIds: Array.from(selected),
      });
      toast.success(`${selected.size} customer(s) assigned`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to assign customers"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Customers</DialogTitle>
        </DialogHeader>
        <SearchInput value={search} onChange={setSearch} placeholder="Search customers..." />
        <div className="max-h-80 overflow-y-auto rounded-xl border border-border/60">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Users className="size-5" />} title="No customers found" />
            </div>
          ) : (
            filtered.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
              >
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.address ?? c.phone ?? "-"}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} loading={busy}>
              Assign Selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
