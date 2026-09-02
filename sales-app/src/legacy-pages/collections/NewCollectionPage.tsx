import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { CustomerSelect } from "@/components/ProductPicker";
import type { CollectionMethod } from "@/types";

const METHODS: CollectionMethod[] = ["CASH", "CHEQUE", "UPI", "BANK_TRANSFER", "CARD", "OTHER"];

export function NewCollectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [customerId, setCustomerId] = useState(params.get("customerId") ?? "");
  const orderId = params.get("orderId") ?? undefined;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CollectionMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const cId = params.get("customerId");
    if (cId) setCustomerId(cId);
  }, [params]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/collections", {
        customerId,
        orderId,
        amount: amt,
        method,
        notes: notes || undefined,
      });
      toast.success("Collection recorded");
      navigate(-1);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not record collection"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Record Collection" back />
      <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-8 pt-4">
        <CustomerSelect value={customerId} onChange={(id) => setCustomerId(id)} />

        {orderId && (
          <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500">
            Linked to order #{orderId.slice(-8)}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Amount (₹)</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-3.5 text-lg font-bold outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  method === m ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                }`}
              >
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-brand-600 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Record Collection"}
        </button>
      </form>
    </div>
  );
}
