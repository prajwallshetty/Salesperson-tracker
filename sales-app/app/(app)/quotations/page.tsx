"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Plus } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
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
          <Button size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link href="/quotations/new" aria-label="New quotation">
              <Plus className="h-5 w-5" />
            </Link>
          </Button>
        }
      />
      <div className="px-4 pt-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : quotations.length === 0 ? (
          <EmptyState icon={<FileText />} title="No quotations yet" />
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
                    <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>
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
    </div>
  );
}
