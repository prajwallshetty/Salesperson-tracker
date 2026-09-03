"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/format";
import { BoxIcon, PlusIcon } from "@/components/icons";
import type { Order, Quotation } from "@/types";
import { format } from "date-fns";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
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
          <Link href="/orders/new" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white active:bg-brand-700">
            <PlusIcon className="h-5 w-5" />
          </Link>
        }
      />
      <div className="px-4 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: "orders", label: "Sales Orders" },
                { value: "quotations", label: "Quotations" },
              ]}
            />
          </div>
        </div>

        {tab === "quotations" ? (
          <QuotationsInline />
        ) : loading ? (
          <SkeletonList count={5} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<BoxIcon className="h-10 w-10 text-slate-300" />}
            title="No orders yet"
            message="Create your first sales order to get started."
            action={
              <Link href="/orders/new" className="mt-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
                New Order
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{o.customer?.name ?? o.number}</p>
                      <p className="text-xs text-slate-400">
                        {o.number} · {format(new Date(o.createdAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", STATUS_COLORS[o.status])}>
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{o.items?.length ?? 0} item(s)</span>
                    <span className="text-base font-extrabold text-slate-900">{formatCurrency(o.grandTotal)}</span>
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

  const QUOTE_STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link href="/quotations/new" className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
          <PlusIcon className="h-3.5 w-3.5" />
          New Quotation
        </Link>
      </div>
      {loading ? (
        <SkeletonList count={4} />
      ) : quotations.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="h-10 w-10 text-slate-300" />}
          title="No quotations yet"
          message="Create a quotation to send to a customer before confirming an order."
        />
      ) : (
        <ul className="space-y-3">
          {quotations.map((q) => (
            <li key={q.id}>
              <Link href={`/quotations/${q.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{q.customer?.name ?? q.number}</p>
                    <p className="text-xs text-slate-400">
                      {q.number} · {format(new Date(q.createdAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", QUOTE_STATUS_COLORS[q.status])}>
                    {q.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{q.items?.length ?? 0} item(s)</span>
                  <span className="text-base font-extrabold text-slate-900">{formatCurrency(q.grandTotal)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
