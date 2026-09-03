"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
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
    <Modal open={open} onClose={onClose} title="Assign Customers" width="max-w-lg">
      <SearchInput value={search} onChange={setSearch} placeholder="Search customers..." className="mb-3" />
      <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-100">
        {loading ? (
          <div className="p-4 text-sm text-slate-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          filtered.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-3 border-b border-slate-50 px-3 py-2.5 last:border-b-0 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{c.name}</p>
                <p className="truncate text-xs text-slate-400">{c.address ?? c.phone ?? "-"}</p>
              </div>
            </label>
          ))
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{selected.size} selected</span>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Assigning..." : "Assign Selected"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
