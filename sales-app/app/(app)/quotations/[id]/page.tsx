"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRightLeft } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { TotalsSummary } from "@/components/ProductPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Quotation, QuotationStatus } from "@/types";

const STATUS_VARIANT: Record<QuotationStatus, "muted" | "info" | "success" | "danger"> = {
  DRAFT: "muted",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
};

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [converting, setConverting] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    api
      .get<Quotation>(`/quotations/${id}`)
      .then((res) => setQuotation(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load quotation")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function updateStatus(status: QuotationStatus) {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      const res = await api.patch<Quotation>(`/quotations/${id}/status`, { status });
      setQuotation((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toast.success("Status updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update status"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function convert() {
    if (!id) return;
    setConverting(true);
    try {
      const res = await api.post(`/quotations/${id}/convert`);
      toast.success("Converted to sales order");
      router.replace(`/orders/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not convert quotation"));
    } finally {
      setConverting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div>
        <PageHeader title="Quotation" back />
        <p className="p-6 text-center text-sm text-muted-foreground">Quotation not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={quotation.number} back subtitle={quotation.customer?.name} />
      <div className="space-y-5 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[quotation.status]}>{quotation.status}</Badge>
          <span className="text-xs text-muted-foreground">{format(new Date(quotation.createdAt), "d MMM yyyy, h:mm a")}</span>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Items</h2>
          <ul className="space-y-2">
            {quotation.items.map((it) => (
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

        <TotalsSummary totals={quotation} />

        {quotation.notes && (
          <div>
            <h2 className="mb-1 text-sm font-bold text-foreground">Notes</h2>
            <p className="text-sm text-muted-foreground">{quotation.notes}</p>
          </div>
        )}

        {quotation.status === "DRAFT" && (
          <Button
            onClick={() => updateStatus("SENT")}
            loading={updatingStatus}
            size="lg"
            variant="outline"
            className="h-[3.25rem] w-full border-primary/30 bg-primary-soft text-primary hover:bg-primary-soft/70"
          >
            Mark as Sent
          </Button>
        )}

        {!quotation.convertedOrderId && quotation.status !== "REJECTED" && (
          <Button onClick={convert} loading={converting} size="lg" variant="success" className="h-14 w-full text-base shadow-md">
            <ArrowRightLeft className="h-5 w-5" />
            {converting ? "Converting…" : "Convert to Order"}
          </Button>
        )}
        {quotation.convertedOrderId && (
          <Button variant="outline" size="lg" className="h-[3.25rem] w-full" onClick={() => router.push(`/orders/${quotation.convertedOrderId}`)}>
            View Converted Order
          </Button>
        )}
      </div>
    </div>
  );
}
