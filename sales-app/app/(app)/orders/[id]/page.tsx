"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { TotalsSummary } from "@/components/ProductPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Order, OrderStatus } from "@/types";

const STATUS_VARIANT: Record<OrderStatus, "info" | "success" | "danger"> = {
  CONFIRMED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Order>(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load order")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order" back />
        <p className="p-6 text-center text-sm text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const balanceDue = order.grandTotal - (order.amountCollected ?? 0);

  return (
    <div>
      <PageHeader title={order.number} back subtitle={order.customer?.name} />
      <div className="space-y-5 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
          <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}</span>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Items</h2>
          <ul className="space-y-2">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-card">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{it.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.quantity} × {formatCurrency(it.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">{formatCurrency(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <TotalsSummary totals={order} />

        {order.amountCollected != null && order.amountCollected > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-success-soft px-4 py-3 text-sm">
            <span className="font-semibold text-success">Collected</span>
            <span className="font-bold text-success">{formatCurrency(order.amountCollected)}</span>
          </div>
        )}
        {balanceDue > 0.5 && (
          <div className="flex items-center justify-between rounded-xl bg-warning-soft px-4 py-3 text-sm">
            <span className="font-semibold text-warning">Balance Due</span>
            <span className="font-bold text-warning">{formatCurrency(balanceDue)}</span>
          </div>
        )}

        <Button size="lg" className="h-14 w-full text-base shadow-md bg-foreground text-background hover:bg-foreground/90" asChild>
          <Link href={`/collections/new?orderId=${order.id}&customerId=${order.customerId}`}>
            <Wallet className="h-5 w-5" />
            Record Collection
          </Link>
        </Button>
      </div>
    </div>
  );
}
