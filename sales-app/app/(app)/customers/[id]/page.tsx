"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navigation, Phone, FileText, ReceiptText } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { mapsLink } from "@/lib/geolocation";
import type { Customer } from "@/types";
import { format } from "date-fns";

const VISIT_STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "danger"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  PLANNED: "muted",
  MISSED: "danger",
  CANCELLED: "muted",
};

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
      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <PageHeader title="Customer" back />
        <p className="p-6 text-center text-sm text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={customer.name} back subtitle={customer.territory?.name} />
      <div className="space-y-5 px-4 pb-8 pt-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          {customer.address && <p className="text-sm text-foreground/90">{customer.address}</p>}
          {customer.notes && <p className="mt-2 text-xs italic text-muted-foreground">{customer.notes}</p>}

          <div className="mt-4 flex gap-2">
            {customer.phone && (
              <Button variant="outline" size="lg" className="flex-1" asChild>
                <a href={`tel:${customer.phone}`}>
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              </Button>
            )}
            {customer.lat != null && customer.lng != null && (
              <Button variant="outline" size="lg" className="flex-1" asChild>
                <a href={mapsLink(customer.lat, customer.lng)} target="_blank" rel="noreferrer">
                  <Navigation className="h-4 w-4" />
                  Navigate
                </a>
              </Button>
            )}
          </div>

          <Button size="lg" className="mt-3 h-14 w-full text-base shadow-md" onClick={startVisit} loading={startingVisit}>
            {startingVisit ? "Starting…" : "Start Visit"}
          </Button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" className="text-sm" asChild>
              <Link href={`/quotations/new?customerId=${customer.id}`}>
                <FileText className="h-4 w-4" />
                Quotation
              </Link>
            </Button>
            <Button variant="secondary" size="lg" className="text-sm" asChild>
              <Link href={`/orders/new?customerId=${customer.id}`}>
                <ReceiptText className="h-4 w-4" />
                Order
              </Link>
            </Button>
          </div>
        </div>

        {!!customer.recentVisits?.length && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-foreground">Recent Visits</h2>
            <ul className="space-y-2">
              {customer.recentVisits.map((v) => (
                <li key={v.id} className="rounded-xl border border-border/60 bg-card p-3 text-sm shadow-card">
                  <div className="flex items-center justify-between">
                    <Badge variant={VISIT_STATUS_VARIANT[v.status] ?? "muted"}>{v.status.replace("_", " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(v.createdAt), "d MMM, h:mm a")}</span>
                  </div>
                  {v.outcome && <p className="mt-1.5 text-xs text-muted-foreground">{v.outcome.replace(/_/g, " ")}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!customer.recentOrders?.length && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-foreground">Recent Orders</h2>
            <ul className="space-y-2">
              {customer.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 text-sm shadow-card">
                  <span className="text-xs text-muted-foreground">{format(new Date(o.createdAt), "d MMM")}</span>
                  <span className="font-bold text-foreground">{formatCurrency(o.grandTotal)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!customer.recentCollections?.length && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-foreground">Recent Collections</h2>
            <ul className="space-y-2">
              {customer.recentCollections.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 text-sm shadow-card">
                  <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "d MMM")}</span>
                  <span className="font-bold text-success">{formatCurrency(c.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
