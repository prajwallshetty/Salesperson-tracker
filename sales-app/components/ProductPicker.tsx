"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { computeDocumentTotals, computeLine } from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";
import { PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import type { Customer, LineItemInput, Product } from "@/types";

export interface CartLine {
  product: Product;
  quantity: number;
  discountPercent: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartLine[]>([]);

  function addProduct(product: Product) {
    setCart((prev) => {
      if (prev.some((l) => l.product.id === product.id)) return prev;
      return [...prev, { product, quantity: 1, discountPercent: product.discountPercent }];
    });
  }
  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.product.id !== productId)
        : prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l))
    );
  }
  function updateDiscount(productId: string, discountPercent: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, discountPercent } : l)));
  }
  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }
  function clear() {
    setCart([]);
  }

  const computedLines = useMemo(
    () =>
      cart.map((l) =>
        computeLine({
          quantity: l.quantity,
          unitPrice: l.product.price,
          discountPercent: l.discountPercent,
          taxPercent: l.product.taxPercent,
        })
      ),
    [cart]
  );
  const totals = useMemo(() => computeDocumentTotals(computedLines), [computedLines]);

  const itemsPayload: LineItemInput[] = cart.map((l) => ({
    productId: l.product.id,
    quantity: l.quantity,
    discountPercent: l.discountPercent,
  }));

  return { cart, addProduct, updateQuantity, updateDiscount, removeLine, clear, computedLines, totals, itemsPayload };
}

export function CustomerSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (customerId: string, customer: Customer | undefined) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/customers", { params: { pageSize: 200 } })
      .then((res) => setCustomers(res.data.items))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load customers")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">Customer</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value, customers.find((c) => c.id === e.target.value))}
        disabled={loading}
        className="w-full rounded-xl border border-slate-300 px-3.5 py-3.5 text-sm outline-none focus:border-brand-500 disabled:opacity-60"
      >
        <option value="">{loading ? "Loading customers…" : "Select a customer…"}</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ProductPickerModal({ onClose, onPick }: { onClose: () => void; onPick: (p: Product) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api
        .get("/products", { params: { search: search || undefined, isActive: true, pageSize: 100 } })
        .then((res) => setProducts(res.data.items))
        .catch((err) => toast.error(apiErrorMessage(err, "Could not load products")))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-t-3xl bg-white p-5 sm:rounded-3xl"
      >
        <h2 className="mb-3 text-lg font-bold text-slate-900">Add Product</h2>
        <div className="relative mb-3">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No products found</p>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onPick(p);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left active:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        {p.sku} · {formatCurrency(p.price)} / {p.unit}
                      </p>
                    </div>
                    <PlusIcon className="h-5 w-5 shrink-0 text-brand-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={onClose} className="mt-3 w-full rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-600">
          Close
        </button>
      </div>
    </div>
  );
}

export function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{line.product.name}</p>
        <p className="text-xs text-slate-400">
          {formatCurrency(line.product.price)} × {line.quantity} · Tax {line.product.taxPercent}%
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onQuantityChange(line.quantity - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 active:bg-slate-200"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-bold">{line.quantity}</span>
        <button
          onClick={() => onQuantityChange(line.quantity + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 active:bg-slate-200"
        >
          +
        </button>
      </div>
      <button onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 active:bg-red-50">
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TotalsSummary({ totals }: { totals: { subtotal: number; discountTotal: number; taxTotal: number; grandTotal: number } }) {
  return (
    <div className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
      <div className="flex justify-between text-slate-500">
        <span>Subtotal</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>Discount</span>
        <span>−{formatCurrency(totals.discountTotal)}</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>Tax</span>
        <span>+{formatCurrency(totals.taxTotal)}</span>
      </div>
      <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 text-base font-extrabold text-slate-900">
        <span>Total</span>
        <span>{formatCurrency(totals.grandTotal)}</span>
      </div>
    </div>
  );
}
