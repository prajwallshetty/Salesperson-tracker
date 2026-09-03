"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, Plus } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Order, OrderStatus, Quotation, QuotationStatus } from "@/types";

const ORDER_STATUS_VARIANT: Record<OrderStatus, "info" | "success" | "danger"> = {
  CONFIRMED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const QUOTE_STATUS_VARIANT: Record<QuotationStatus, "muted" | "info" | "success" | "danger"> = {
  DRAFT: "muted",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
};

export default function OrdersPage() {
  const [tab, setTab] = useState<"orders" | "quotations">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Order[]>("/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load orders")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Orders"
        right={
          <Button size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link href={tab === "orders" ? "/orders/new" : "/quotations/new"} aria-label="New">
              <Plus className="h-5 w-5" />
            </Link>
          </Button>
        }
      />
      <div className="px-4 pt-4">
        <div className="mb-4">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "orders", label: "Sales Orders" },
              { value: "quotations", label: "Quotations" },
            ]}
          />
        </div>

        {tab === "quotations" ? (
          <QuotationsInline />
        ) : loading ? (
          <SkeletonList count={5} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="No orders yet"
            message="Create your first sales order to get started."
            action={
              <Button asChild>
                <Link href="/orders/new">New Order</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="block rounded-2xl border border-border/60 bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{o.customer?.name ?? o.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.number} · {format(new Date(o.createdAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{o.status}</Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{o.items?.length ?? 0} item(s)</span>
                    <span className="text-base font-extrabold text-foreground">{formatCurrency(o.grandTotal)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuotationsInline() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/quotations")
      .then((res) => setQuotations(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load quotations")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link
          href="/quotations/new"
          className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary active:bg-primary-soft/70"
        >
          <Plus className="h-3.5 w-3.5" />
          New Quotation
        </Link>
      </div>
      {loading ? (
        <SkeletonList count={4} />
      ) : quotations.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="No quotations yet"
          message="Create a quotation to send to a customer before confirming an order."
        />
      ) : (
        <ul className="space-y-3">
          {quotations.map((q) => (
            <li key={q.id}>
              <Link href={`/quotations/${q.id}`} className="block rounded-2xl border border-border/60 bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{q.customer?.name ?? q.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.number} · {format(new Date(q.createdAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <Badge variant={QUOTE_STATUS_VARIANT[q.status]}>{q.status}</Badge>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{q.items?.length ?? 0} item(s)</span>
                  <span className="text-base font-extrabold text-foreground">{formatCurrency(q.grandTotal)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
