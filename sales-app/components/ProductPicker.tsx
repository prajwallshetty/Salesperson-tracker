"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { computeDocumentTotals, computeLine } from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Customer, LineItemInput, Product } from "@/types";

export interface CartLine {
  product: Product;
  quantity: number;
  discountPercent: number;
}

export function useCart(initial: CartLine[] = []) {
  const [cart, setCart] = useState<CartLine[]>(initial);

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
    <div className="space-y-1.5">
      <Label>Customer</Label>
      <Select
        value={value || undefined}
        onValueChange={(id) => onChange(id, customers.find((c) => c.id === id))}
        disabled={loading}
      >
        <SelectTrigger className="h-12">
          <SelectValue placeholder={loading ? "Loading customers…" : "Select a customer…"} />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-3">
          <DrawerTitle>Add Product</DrawerTitle>
        </DrawerHeader>
        <div className="px-5 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="h-11 pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products found</p>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onPick(p);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-border/60 p-3.5 text-left transition active:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku} · {formatCurrency(p.price)} / {p.unit}
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
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
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{line.product.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(line.product.price)} × {line.quantity} · Tax {line.product.taxPercent}%
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onQuantityChange(line.quantity - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition active:bg-border"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-sm font-bold text-foreground">{line.quantity}</span>
        <button
          onClick={() => onQuantityChange(line.quantity + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition active:bg-border"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-lg text-danger transition active:bg-danger-soft" aria-label="Remove item">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TotalsSummary({ totals }: { totals: { subtotal: number; discountTotal: number; taxTotal: number; grandTotal: number } }) {
  return (
    <div className="space-y-1.5 rounded-2xl bg-muted/60 p-4 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Discount</span>
        <span>−{formatCurrency(totals.discountTotal)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Tax</span>
        <span>+{formatCurrency(totals.taxTotal)}</span>
      </div>
      <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-base font-extrabold text-foreground">
        <span>Total</span>
        <span>{formatCurrency(totals.grandTotal)}</span>
      </div>
    </div>
  );
}
