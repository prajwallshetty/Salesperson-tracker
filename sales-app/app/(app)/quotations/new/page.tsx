"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { CartLineRow, CustomerSelect, ProductPickerModal, TotalsSummary, useCart } from "@/components/ProductPicker";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

export default function NewQuotationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [customerId, setCustomerId] = useState(params.get("customerId") ?? "");
  const [notes, setNotes] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { cart, addProduct, updateQuantity, removeLine, totals, itemsPayload } = useCart();

  useEffect(() => {
    const cId = params.get("customerId");
    if (cId) setCustomerId(cId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    if (cart.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/quotations", { customerId, items: itemsPayload, notes: notes || undefined });
      toast.success("Quotation saved as draft");
      router.replace(`/quotations/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not create quotation"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Quotation" back />
      <div className="space-y-5 px-4 pb-32 pt-4">
        <CustomerSelect value={customerId} onChange={(id) => setCustomerId(id)} />

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <Label>Products</Label>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 rounded-full bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary active:bg-primary-soft/70"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </button>
          </div>
          {cart.length === 0 ? (
            <EmptyState icon={<FileText />} title="No products added" message="Tap 'Add Product' to build this quotation." />
          ) : (
            <div className="space-y-2">
              {cart.map((line) => (
                <CartLineRow
                  key={line.product.id}
                  line={line}
                  onQuantityChange={(q) => updateQuantity(line.product.id, q)}
                  onRemove={() => removeLine(line.product.id)}
                />
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && <TotalsSummary totals={totals} />}

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-lg border-t border-border/60 bg-card/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-3">
          {cart.length > 0 && (
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="truncate text-lg font-extrabold text-foreground">{formatCurrency(totals.grandTotal)}</p>
            </div>
          )}
          <Button onClick={submit} loading={submitting} size="lg" className="h-14 flex-1 text-base shadow-md">
            {submitting ? "Saving…" : "Save Quotation"}
          </Button>
        </div>
      </div>

      {showPicker && <ProductPickerModal onClose={() => setShowPicker(false)} onPick={addProduct} />}
    </div>
  );
}
