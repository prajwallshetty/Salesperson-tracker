import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Modal } from "../../components/Modal";
import { FieldWrap, TextField, SelectField } from "../../components/FormField";
import { api, apiErrorMessage } from "../../lib/api";
import type { Salesperson, Territory } from "../../types";

interface AddSalespersonModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddSalespersonModal({ open, onClose, onCreated }: AddSalespersonModalProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<Salesperson[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    employeeCode: "",
    territoryId: "",
    managerId: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", email: "", password: "", phone: "", employeeCode: "", territoryId: "", managerId: "" });
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
    api.get("/salespersons?pageSize=100").then((res) => setManagers(res.data.items ?? []));
  }, [open]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/salespersons", {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        employeeCode: form.employeeCode,
        territoryId: form.territoryId || undefined,
        managerId: form.managerId || undefined,
      });
      toast.success("Salesperson created");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create salesperson"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Salesperson" width="max-w-xl">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FieldWrap label="Full name" required>
            <TextField required value={form.name} onChange={set("name")} placeholder="Jane Doe" />
          </FieldWrap>
          <FieldWrap label="Employee code" required>
            <TextField required value={form.employeeCode} onChange={set("employeeCode")} placeholder="SP009" />
          </FieldWrap>
          <FieldWrap label="Email" required>
            <TextField type="email" required value={form.email} onChange={set("email")} placeholder="jane@company.com" />
          </FieldWrap>
          <FieldWrap label="Password" required hint="Min 6 characters">
            <TextField type="password" required minLength={6} value={form.password} onChange={set("password")} placeholder="••••••••" />
          </FieldWrap>
          <FieldWrap label="Phone">
            <TextField value={form.phone} onChange={set("phone")} placeholder="+91 90000 00000" />
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
          <FieldWrap label="Manager" hint="Optional reporting manager">
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
            {busy ? "Creating..." : "Create Salesperson"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
