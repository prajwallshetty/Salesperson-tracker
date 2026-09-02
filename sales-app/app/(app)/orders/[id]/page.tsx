"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { TotalsSummary } from "@/components/ProductPicker";
import { formatCurrency } from "@/lib/format";
import type { Order } from "@/types";
import { format } from "date-fns";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
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
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order" back />
        <p className="p-6 text-center text-sm text-slate-500">Order not found.</p>
      </div>
    );
  }

  const balanceDue = order.grandTotal - (order.amountCollected ?? 0);

  return (
    <div>
      <PageHeader title={order.number} back subtitle={order.customer?.name} />
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <span className={clsx("rounded-full px-3 py-1 text-xs font-bold", STATUS_COLORS[order.status])}>{order.status}</span>
          <span className="text-xs text-slate-400">{format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}</span>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-700">Items</h2>
          <ul className="space-y-2">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{it.product?.name}</p>
                  <p className="text-xs text-slate-400">
                    {it.quantity} × {formatCurrency(it.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <TotalsSummary totals={order} />

        {order.amountCollected != null && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm">
            <span className="font-semibold text-emerald-700">Collected</span>
            <span className="font-bold text-emerald-700">{formatCurrency(order.amountCollected)}</span>
          </div>
        )}
        {balanceDue > 0.5 && (
          <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm">
            <span className="font-semibold text-amber-700">Balance Due</span>
            <span className="font-bold text-amber-700">{formatCurrency(balanceDue)}</span>
          </div>
        )}

        <Link
          href={`/collections/new?orderId=${order.id}&customerId=${order.customerId}`}
          className="block w-full rounded-2xl bg-slate-900 py-4 text-center text-base font-extrabold text-white active:scale-[0.98]"
        >
          Record Collection
        </Link>
      </div>
    </div>
  );
}
