"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { TotalsSummary } from "@/components/ProductPicker";
import { formatCurrency } from "@/lib/format";
import type { Quotation, QuotationStatus } from "@/types";
import { format } from "date-fns";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
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
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div>
        <PageHeader title="Quotation" back />
        <p className="p-6 text-center text-sm text-slate-500">Quotation not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={quotation.number} back subtitle={quotation.customer?.name} />
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <span className={clsx("rounded-full px-3 py-1 text-xs font-bold", STATUS_COLORS[quotation.status])}>
            {quotation.status}
          </span>
          <span className="text-xs text-slate-400">{format(new Date(quotation.createdAt), "d MMM yyyy, h:mm a")}</span>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-700">Items</h2>
          <ul className="space-y-2">
            {quotation.items.map((it) => (
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

        <TotalsSummary totals={quotation} />

        {quotation.notes && (
          <div>
            <h2 className="mb-1 text-sm font-bold text-slate-700">Notes</h2>
            <p className="text-sm text-slate-500">{quotation.notes}</p>
          </div>
        )}

        {quotation.status === "DRAFT" && (
          <button
            onClick={() => updateStatus("SENT")}
            disabled={updatingStatus}
            className="w-full rounded-2xl border border-brand-200 bg-brand-50 py-3.5 text-sm font-extrabold text-brand-700 disabled:opacity-60"
          >
            Mark as Sent
          </button>
        )}

        {!quotation.convertedOrderId && quotation.status !== "REJECTED" && (
          <button
            onClick={convert}
            disabled={converting}
            className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {converting ? "Converting…" : "Convert to Order"}
          </button>
        )}
        {quotation.convertedOrderId && (
          <button
            onClick={() => router.push(`/orders/${quotation.convertedOrderId}`)}
            className="w-full rounded-2xl border border-slate-300 py-3.5 text-sm font-bold text-slate-700"
          >
            View Converted Order
          </button>
        )}
      </div>
    </div>
  );
}
