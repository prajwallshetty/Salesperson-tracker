"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/format";
import { toast } from "sonner";
import type { Collection, FollowUp, Order, Salesperson, TargetRow, TopPerformerRow, Visit } from "@/types";

export type DrilldownKind =
  | "salespersons"
  | "sales"
  | "visits"
  | "followups"
  | "orders"
  | "collections"
  | "targets"
  | "top-performers"
  | null;

interface DrilldownDrawerProps {
  kind: DrilldownKind;
  onClose: () => void;
}

const TITLES: Record<string, string> = {
  salespersons: "Salespersons",
  sales: "Today's Sales",
  visits: "Today's Visits",
  followups: "Pending Follow-ups",
  orders: "Today's Orders",
  collections: "Today's Collections",
  targets: "Target vs Achievement",
  "top-performers": "Top Performing Salespersons",
};

const ENDPOINTS: Record<string, string> = {
  salespersons: "/dashboard/salespersons?status=ALL",
  sales: "/dashboard/sales?range=today",
  visits: "/dashboard/visits?range=today",
  followups: "/dashboard/followups?status=PENDING",
  orders: "/dashboard/orders?range=today",
  collections: "/dashboard/collections?range=today",
  targets: "/dashboard/targets",
  "top-performers": "/dashboard/top-performers?range=month",
};

export function DrilldownDrawer({ kind, onClose }: DrilldownDrawerProps) {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setLoading(true);
    api
      .get(ENDPOINTS[kind])
      .then((res) => setData(Array.isArray(res.data) ? res.data : []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load details")))
      .finally(() => setLoading(false));
  }, [kind]);

  return (
    <Drawer open={!!kind} onClose={onClose} title={kind ? TITLES[kind] : ""} width="max-w-2xl">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState title="Nothing here yet" message="No records match this view right now." />
      ) : kind === "salespersons" ? (
        <SalespersonList items={data as Salesperson[]} />
      ) : kind === "sales" || kind === "orders" ? (
        <OrderList items={data as Order[]} />
      ) : kind === "visits" ? (
        <VisitList items={data as Visit[]} />
      ) : kind === "followups" ? (
        <FollowupList items={data as FollowUp[]} />
      ) : kind === "collections" ? (
        <CollectionList items={data as Collection[]} />
      ) : kind === "targets" ? (
        <TargetList items={data as TargetRow[]} />
      ) : kind === "top-performers" ? (
        <TopPerformerList items={data as TopPerformerRow[]} />
      ) : null}
    </Drawer>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/60">{children}</div>;
}

function SalespersonList({ items }: { items: Salesperson[] }) {
  return (
    <div className="space-y-2">
      {items.map((sp) => (
        <Row key={sp.id}>
          <div className="flex items-center gap-3">
            <Avatar name={sp.user.name} src={sp.user.avatarUrl} online={sp.isOnline} />
            <div>
              <p className="text-sm font-medium text-foreground">{sp.user.name}</p>
              <p className="text-xs text-muted-foreground">{sp.territory?.name ?? "Unassigned"} &middot; {sp.employeeCode}</p>
            </div>
          </div>
          <StatusBadge status={sp.status} />
        </Row>
      ))}
    </div>
  );
}

function OrderList({ items }: { items: Order[] }) {
  return (
    <div className="space-y-2">
      {items.map((o) => (
        <Row key={o.id}>
          <div>
            <p className="text-sm font-medium text-foreground">{o.number} &middot; {o.customer?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{o.salesperson?.user?.name ?? "-"} &middot; {formatDateTime(o.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{formatCurrency(o.grandTotal)}</p>
            <StatusBadge status={o.status} />
          </div>
        </Row>
      ))}
    </div>
  );
}

function VisitList({ items }: { items: Visit[] }) {
  return (
    <div className="space-y-2">
      {items.map((v) => (
        <Row key={v.id}>
          <div>
            <p className="text-sm font-medium text-foreground">{v.customer?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{v.salesperson?.user?.name ?? "-"} &middot; {v.checkInAt ? relativeTime(v.checkInAt) : "Not checked in"}</p>
          </div>
          <StatusBadge status={v.status} />
        </Row>
      ))}
    </div>
  );
}

function FollowupList({ items }: { items: FollowUp[] }) {
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <Row key={f.id}>
          <div>
            <p className="text-sm font-medium text-foreground">{f.customer?.name ?? f.lead?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{f.salesperson?.user?.name ?? "-"} &middot; due {formatDateTime(f.dueDate)}</p>
          </div>
          <StatusBadge status={f.status} />
        </Row>
      ))}
    </div>
  );
}

function CollectionList({ items }: { items: Collection[] }) {
  return (
    <div className="space-y-2">
      {items.map((c) => (
        <Row key={c.id}>
          <div>
            <p className="text-sm font-medium text-foreground">{c.customer?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{c.salesperson?.user?.name ?? "-"} &middot; {c.method} &middot; {relativeTime(c.collectedAt)}</p>
          </div>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(c.amount)}</p>
        </Row>
      ))}
    </div>
  );
}

function TargetList({ items }: { items: TargetRow[] }) {
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <div key={t.salespersonId} className="rounded-lg border border-border/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar name={t.name} src={t.avatarUrl} size="sm" />
              <p className="text-sm font-medium text-foreground">{t.name}</p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">{t.percent}%</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, t.percent)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {formatCurrency(t.achieved)} of {formatCurrency(t.targetAmount)}
          </p>
        </div>
      ))}
    </div>
  );
}

function TopPerformerList({ items }: { items: TopPerformerRow[] }) {
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <Row key={t.salespersonId}>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <Avatar name={t.name} src={t.avatarUrl} size="sm" />
            <p className="text-sm font-medium text-foreground">{t.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{formatCurrency(t.sales)}</p>
            <p className="text-xs text-muted-foreground">{t.orders} orders</p>
          </div>
        </Row>
      ))}
    </div>
  );
}
