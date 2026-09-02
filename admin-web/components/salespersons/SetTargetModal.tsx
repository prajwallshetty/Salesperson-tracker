"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/Modal";
import { FieldWrap, TextField, SelectField } from "@/components/FormField";
import { api, apiErrorMessage } from "@/lib/api";
import { todayIso } from "@/lib/format";

interface SetTargetModalProps {
  open: boolean;
  salespersonId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SetTargetModal({ open, salespersonId, onClose, onSaved }: SetTargetModalProps) {
  const [period, setPeriod] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  const [periodStart, setPeriodStart] = useState(todayIso());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [targetAmount, setTargetAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/salespersons/${salespersonId}/targets`, {
        period,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        targetAmount: Number(targetAmount),
      });
      toast.success("Target set successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to set target"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Target" width="max-w-md">
      <form onSubmit={onSubmit}>
        <FieldWrap label="Period" required>
          <SelectField value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </SelectField>
        </FieldWrap>
        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Start date" required>
            <TextField type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="End date" required>
            <TextField type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </FieldWrap>
        </div>
        <FieldWrap label="Target amount (₹)" required>
          <TextField
            type="number"
            required
            min={1}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="100000"
          />
        </FieldWrap>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Set Target"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
