"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/format";
import { BoxIcon, PlusIcon } from "@/components/icons";
import type { Quotation } from "@/types";
import { format } from "date-fns";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Quotation[]>("/quotations")
      .then((res) => setQuotations(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load quotations")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Quotations"
        back
        right={
          <Link href="/quotations/new" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white active:bg-brand-700">
            <PlusIcon className="h-5 w-5" />
          </Link>
        }
      />
      <div className="px-4 pt-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : quotations.length === 0 ? (
          <EmptyState icon={<BoxIcon className="h-10 w-10 text-slate-300" />} title="No quotations yet" />
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
                    <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", STATUS_COLORS[q.status])}>
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
    </div>
  );
}
