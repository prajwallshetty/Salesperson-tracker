"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { formatCurrency } from "@/lib/format";
import { mapsLink } from "@/lib/geolocation";
import { NavigationIcon, PhoneIcon } from "@/components/icons";
import type { Customer } from "@/types";
import { format } from "date-fns";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingVisit, setStartingVisit] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Customer>(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load customer")))
      .finally(() => setLoading(false));
  }, [id]);

  async function startVisit() {
    if (!id) return;
    setStartingVisit(true);
    try {
      const res = await api.post("/visits", { customerId: id });
      toast.success("Visit started");
      router.push(`/visits/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not start visit"));
    } finally {
      setStartingVisit(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <PageHeader title="Customer" back />
        <p className="p-6 text-center text-sm text-slate-500">Customer not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={customer.name} back subtitle={customer.territory?.name} />
      <div className="space-y-4 px-4 pt-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {customer.address && <p className="text-sm text-slate-600">{customer.address}</p>}
          {customer.notes && <p className="mt-2 text-xs italic text-slate-400">{customer.notes}</p>}

          <div className="mt-4 flex gap-2">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 active:bg-slate-50"
              >
                <PhoneIcon className="h-4 w-4" />
                Call
              </a>
            )}
            {customer.lat != null && customer.lng != null && (
              <a
                href={mapsLink(customer.lat, customer.lng)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 active:bg-slate-50"
              >
                <NavigationIcon className="h-4 w-4" />
                Directions
              </a>
            )}
          </div>

          <button
            onClick={startVisit}
            disabled={startingVisit}
            className="mt-3 w-full rounded-xl bg-brand-600 py-3.5 text-sm font-extrabold text-white active:bg-brand-700 disabled:opacity-60"
          >
            {startingVisit ? "Starting…" : "Start Visit"}
          </button>
        </div>

        {!!customer.recentVisits?.length && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-slate-700">Recent Visits</h2>
            <ul className="space-y-2">
              {customer.recentVisits.map((v) => (
                <li key={v.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{v.status.replace("_", " ")}</span>
                    <span className="text-xs text-slate-400">{format(new Date(v.createdAt), "d MMM, h:mm a")}</span>
                  </div>
                  {v.outcome && <p className="mt-1 text-xs text-slate-500">{v.outcome.replace(/_/g, " ")}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!customer.recentOrders?.length && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-slate-700">Recent Orders</h2>
            <ul className="space-y-2">
              {customer.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <span className="text-xs text-slate-400">{format(new Date(o.createdAt), "d MMM")}</span>
                  <span className="font-bold text-slate-800">{formatCurrency(o.grandTotal)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!customer.recentCollections?.length && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-slate-700">Recent Collections</h2>
            <ul className="space-y-2">
              {customer.recentCollections.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <span className="text-xs text-slate-400">{format(new Date(c.createdAt), "d MMM")}</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(c.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
