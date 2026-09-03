"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Banknote, CreditCard, Landmark, Receipt, Smartphone, Wallet } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { CustomerSelect } from "@/components/ProductPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CollectionMethod } from "@/types";

const METHODS: { value: CollectionMethod; label: string; icon: typeof Banknote }[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CHEQUE", label: "Cheque", icon: Receipt },
  { value: "UPI", label: "UPI", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "OTHER", label: "Other", icon: Wallet },
];

export default function NewCollectionPage() {
  const router = useRouter();
  const params = useSearchParams();
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
      router.back();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not record collection"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Record Collection" back />
      <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-8 pt-4">
        <CustomerSelect value={customerId} onChange={(id) => setCustomerId(id)} />

        {orderId && (
          <div className="rounded-xl bg-muted px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            Linked to order #{orderId.slice(-8)}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Amount (₹)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-input bg-card py-4 pl-9 pr-4 text-2xl font-extrabold tracking-tight text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition-colors",
                  method === value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border/60 bg-card text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <Button type="submit" size="lg" loading={submitting} className="h-14 w-full text-base shadow-md">
          {submitting ? "Saving…" : "Record Collection"}
        </Button>
      </form>
    </div>
  );
}
