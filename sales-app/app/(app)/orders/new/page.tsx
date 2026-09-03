"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { CartLineRow, CustomerSelect, ProductPickerModal, TotalsSummary, useCart } from "@/components/ProductPicker";
import { BoxIcon, PlusIcon } from "@/components/icons";
import { EmptyState } from "@/components/EmptyState";

export default function NewOrderPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { cart, addProduct, updateQuantity, removeLine, totals, itemsPayload } = useCart();

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
      const res = await api.post("/orders", { customerId, items: itemsPayload, notes: notes || undefined });
      toast.success("Order created");
      router.replace(`/orders/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not create order"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Sales Order" back />
      <div className="space-y-4 px-4 pb-8 pt-4">
        <CustomerSelect value={customerId} onChange={(id) => setCustomerId(id)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500">Products</label>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add Product
            </button>
          </div>
          {cart.length === 0 ? (
            <EmptyState icon={<BoxIcon className="h-8 w-8 text-slate-300" />} title="No products added" message="Tap 'Add Product' to build this order." />
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
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-2xl bg-brand-600 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create Order"}
        </button>
      </div>

      {showPicker && <ProductPickerModal onClose={() => setShowPicker(false)} onPick={addProduct} />}
    </div>
  );
}
