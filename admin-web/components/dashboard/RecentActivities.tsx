"use client";

import { useEffect, useState } from "react";
import { Flame, Footprints, ShoppingCart, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { cn } from "@/lib/utils";
import type { Collection, Lead, Order, Visit } from "@/types";

type ActivityKind = "visit" | "order" | "collection" | "lead";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  at: string;
}

const KIND_META: Record<ActivityKind, { icon: typeof Footprints; bg: string; color: string }> = {
  visit: { icon: Footprints, bg: "bg-pastel-teal", color: "text-info" },
  order: { icon: ShoppingCart, bg: "bg-pastel-blue", color: "text-primary" },
  collection: { icon: Wallet, bg: "bg-pastel-green", color: "text-success" },
  lead: { icon: Flame, bg: "bg-pastel-amber", color: "text-warning" },
};

export function RecentActivities() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/visits", { params: { range: "today" } }).catch(() => ({ data: [] })),
      api.get("/dashboard/orders", { params: { range: "today" } }).catch(() => ({ data: [] })),
      api.get("/dashboard/collections", { params: { range: "today" } }).catch(() => ({ data: [] })),
      api.get("/leads").catch(() => ({ data: [] })),
    ])
      .then(([visitsRes, ordersRes, collectionsRes, leadsRes]) => {
        const visits: ActivityItem[] = ((visitsRes.data ?? []) as Visit[])
          .filter((v) => v.checkInAt)
          .map((v) => ({
            id: `visit-${v.id}`,
            kind: "visit" as const,
            title: `${v.salesperson?.user?.name ?? "A salesperson"} visited ${v.customer?.name ?? "a customer"}`,
            description: v.outcome ? v.outcome.replace(/_/g, " ").toLowerCase() : v.status.replace(/_/g, " ").toLowerCase(),
            at: v.checkInAt as string,
          }));
        const orders: ActivityItem[] = ((ordersRes.data ?? []) as Order[]).map((o) => ({
          id: `order-${o.id}`,
          kind: "order" as const,
          title: `Order ${o.number} from ${o.customer?.name ?? "a customer"}`,
          description: `${o.salesperson?.user?.name ?? "-"} · ${formatCurrency(o.grandTotal)}`,
          at: o.createdAt,
        }));
        const collections: ActivityItem[] = ((collectionsRes.data ?? []) as Collection[]).map((c) => ({
          id: `collection-${c.id}`,
          kind: "collection" as const,
          title: `Payment collected from ${c.customer?.name ?? "a customer"}`,
          description: `${c.salesperson?.user?.name ?? "-"} · ${formatCurrency(c.amount)} · ${c.method.replace(/_/g, " ")}`,
          at: c.collectedAt,
        }));
        const leads: ActivityItem[] = ((leadsRes.data ?? []) as Lead[])
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((l) => ({
            id: `lead-${l.id}`,
            kind: "lead" as const,
            title: `New lead: ${l.name}`,
            description: `${l.salesperson?.user?.name ?? "-"}${l.company ? ` · ${l.company}` : ""}`,
            at: l.createdAt,
          }));

        const merged = [...visits, ...orders, ...collections, ...leads]
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 8);
        setItems(merged);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState title="No activity yet today" message="Visits, orders, collections and leads will show up here as they happen." />;
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const meta = KIND_META[item.kind];
        const Icon = meta.icon;
        return (
          <div key={item.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/60">
            <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", meta.bg, meta.color)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{item.description}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(item.at)}</span>
          </div>
        );
      })}
    </div>
  );
}
