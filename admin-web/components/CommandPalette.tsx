"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserCheck, Package, ShoppingCart, FileText, Flame, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Customer, Lead, Order, Product, Quotation, Salesperson } from "@/types";

interface Results {
  salespersons: Salesperson[];
  customers: Customer[];
  products: Product[];
  leads: Lead[];
  orders: Order[];
  quotations: Quotation[];
}

const EMPTY: Results = { salespersons: [], customers: [], products: [], leads: [], orders: [], quotations: [] };

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);

  // Orders and quotations have no server-side search param (see
  // API_CONTRACT.md), so instead of re-fetching the full list on every
  // keystroke, fetch each once per palette session (on open) and filter the
  // cached copy client-side as the query changes.
  const ordersCache = useRef<Order[] | null>(null);
  const quotationsCache = useRef<Quotation[] | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY);
      // Drop the cache on close so the next session sees fresh data instead
      // of carrying an arbitrarily stale copy for the component's lifetime.
      ordersCache.current = null;
      quotationsCache.current = null;
      return;
    }
    if (ordersCache.current === null) {
      api
        .get("/orders")
        .then((res) => {
          ordersCache.current = res.data ?? [];
        })
        .catch(() => {
          ordersCache.current = [];
        });
    }
    if (quotationsCache.current === null) {
      api
        .get("/quotations")
        .then((res) => {
          quotationsCache.current = res.data ?? [];
        })
        .catch(() => {
          quotationsCache.current = [];
        });
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(EMPTY);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        api.get("/salespersons", { params: { search: q, pageSize: 5 } }).catch(() => ({ data: { items: [] } })),
        api.get("/customers", { params: { search: q, pageSize: 5 } }).catch(() => ({ data: { items: [] } })),
        api.get("/products", { params: { search: q, pageSize: 5 } }).catch(() => ({ data: { items: [] } })),
        api.get("/leads", { params: { search: q } }).catch(() => ({ data: [] })),
      ]).then(([sp, cu, pr, le]) => {
        const lower = q.toLowerCase();
        const orders: Order[] = (ordersCache.current ?? []).filter(
          (o: Order) => o.number?.toLowerCase().includes(lower) || o.customer?.name?.toLowerCase().includes(lower)
        );
        const quotations: Quotation[] = (quotationsCache.current ?? []).filter((qt: Quotation) =>
          qt.customer?.name?.toLowerCase().includes(lower)
        );
        setResults({
          salespersons: sp.data.items ?? [],
          customers: cu.data.items ?? [],
          products: pr.data.items ?? [],
          leads: (le.data ?? []).slice(0, 5),
          orders: orders.slice(0, 5),
          quotations: quotations.slice(0, 5),
        });
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const hasAny =
    results.salespersons.length ||
    results.customers.length ||
    results.products.length ||
    results.leads.length ||
    results.orders.length ||
    results.quotations.length;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search salespersons, customers, products, orders..." value={query} onValueChange={setQuery} />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching...
          </div>
        )}
        {!loading && query && !hasAny && <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>}
        {!loading && !query && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Start typing to search across your sales data.
          </div>
        )}

        {results.salespersons.length > 0 && (
          <CommandGroup heading="Salespersons">
            {results.salespersons.map((sp) => (
              <CommandItem key={sp.id} onSelect={() => go(`/salespersons/${sp.id}`)}>
                <Users /> {sp.user.name}
                <span className="ml-auto text-xs text-muted-foreground">{sp.employeeCode}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.customers.length > 0 && (
          <CommandGroup heading="Customers">
            {results.customers.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/customers/${c.id}`)}>
                <UserCheck /> {c.name}
                {c.phone && <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.products.length > 0 && (
          <CommandGroup heading="Products">
            {results.products.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(`/products/${p.id}`)}>
                <Package /> {p.name}
                <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(p.price)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.leads.length > 0 && (
          <CommandGroup heading="Leads">
            {results.leads.map((l) => (
              <CommandItem key={l.id} onSelect={() => go(`/leads?search=${encodeURIComponent(l.name)}`)}>
                <Flame /> {l.name}
                {l.company && <span className="ml-auto text-xs text-muted-foreground">{l.company}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.orders.length > 0 && (
          <CommandGroup heading="Orders">
            {results.orders.map((o) => (
              <CommandItem key={o.id} onSelect={() => go(`/orders`)}>
                <ShoppingCart /> {o.number} &middot; {o.customer?.name ?? "-"}
                <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(o.grandTotal)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.quotations.length > 0 && (
          <CommandGroup heading="Quotations">
            {results.quotations.map((q) => (
              <CommandItem key={q.id} onSelect={() => go(`/quotations`)}>
                <FileText /> {q.customer?.name ?? "Quotation"}
                <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(q.grandTotal)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
