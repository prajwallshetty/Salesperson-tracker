"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { FieldWrap, TextField, SelectField } from "@/components/FormField";
import { api, apiErrorMessage } from "@/lib/api";
import type { Salesperson, Territory } from "@/types";

interface EditSalespersonModalProps {
  open: boolean;
  salesperson: Salesperson | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSalespersonModal({ open, salesperson, onClose, onSaved }: EditSalespersonModalProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<Salesperson[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", employeeCode: "", territoryId: "", managerId: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !salesperson) return;
    setForm({
      name: salesperson.user.name,
      phone: salesperson.user.phone ?? "",
      employeeCode: salesperson.employeeCode,
      territoryId: salesperson.territoryId ?? "",
      managerId: salesperson.managerId ?? "",
    });
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
    api.get("/salespersons?pageSize=100").then((res) =>
      setManagers((res.data.items ?? []).filter((m: Salesperson) => m.id !== salesperson.id))
    );
  }, [open, salesperson]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!salesperson) return;
    setBusy(true);
    try {
      await api.patch(`/salespersons/${salesperson.id}`, {
        name: form.name,
        phone: form.phone || undefined,
        employeeCode: form.employeeCode,
        territoryId: form.territoryId || null,
        managerId: form.managerId || null,
      });
      toast.success("Salesperson updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update salesperson"));
    } finally {
      setBusy(false);
    }
  };

  if (!salesperson) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Salesperson" width="max-w-xl">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FieldWrap label="Full name" required>
            <TextField required value={form.name} onChange={set("name")} />
          </FieldWrap>
          <FieldWrap label="Employee code" required>
            <TextField required value={form.employeeCode} onChange={set("employeeCode")} />
          </FieldWrap>
          <FieldWrap label="Phone">
            <TextField value={form.phone} onChange={set("phone")} />
          </FieldWrap>
          <FieldWrap label="Territory">
            <SelectField value={form.territoryId} onChange={set("territoryId")}>
              <option value="">Unassigned</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="Manager">
            <SelectField value={form.managerId} onChange={set("managerId")}>
              <option value="">None</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name}
                </option>
              ))}
            </SelectField>
          </FieldWrap>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
