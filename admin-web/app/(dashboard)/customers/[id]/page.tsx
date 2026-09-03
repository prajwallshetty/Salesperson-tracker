"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { IconUsers } from "@/components/icons";
import type { Customer } from "@/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load customer")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return <EmptyState icon={<IconUsers className="h-6 w-6" />} title="Customer not found" />;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/customers")} className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Back to Customers
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h1 className="text-lg font-semibold text-slate-800">{customer.name}</h1>
        <p className="text-sm text-slate-400">
          {customer.territory?.name ?? "Unassigned territory"} &middot; {customer.salesperson?.user?.name ?? "Unassigned salesperson"}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Phone" value={customer.phone ?? "-"} />
          <InfoRow label="Email" value={customer.email ?? "-"} />
          <InfoRow label="Address" value={customer.address ?? "-"} />
          <InfoRow
            label="Location"
            value={customer.lat && customer.lng ? `${customer.lat.toFixed(5)}, ${customer.lng.toFixed(5)}` : "-"}
          />
        </div>
        {customer.notes && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{customer.notes}</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Recent Visits</div>
          {!customer.visits || customer.visits.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No visits yet" />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {customer.visits.map((v) => (
                <div key={v.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{v.checkInAt ? formatDateTime(v.checkInAt) : "Planned"}</p>
                    <StatusBadge status={v.status} />
                  </div>
                  {v.outcome && <p className="mt-0.5 text-xs text-slate-400">{v.outcome.replace(/_/g, " ")}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Recent Orders</div>
          {!customer.orders || customer.orders.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No orders yet" />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {customer.orders.map((o) => (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{o.number}</p>
                    <span className="text-sm font-semibold text-slate-800">{formatCurrency(o.grandTotal)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Recent Collections</div>
          {!customer.collections || customer.collections.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No collections yet" />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {customer.collections.map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{c.method.replace(/_/g, " ")}</p>
                    <span className="text-sm font-semibold text-slate-800">{formatCurrency(c.amount)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(c.collectedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
