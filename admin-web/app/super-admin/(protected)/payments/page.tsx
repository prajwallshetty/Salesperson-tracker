"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Paginated, PlatformPaymentItem } from "@/types";

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "success" | "danger" | "muted"> = {
  captured: "success",
  failed: "danger",
};

export default function SuperAdminPaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformPaymentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => setPage(1), [status]);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/payments", { params: { status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load payments"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Derived from verified Razorpay webhook deliveries - real payments only." />

      <FilterSelect
        value={status}
        onChange={setStatus}
        placeholder="All statuses"
        options={[
          { value: "captured", label: "Captured" },
          { value: "failed", label: "Failed" },
        ]}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Payment ID</TableHead>
            <TableHead>Subscription ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<Wallet className="size-5" />} title="Couldn't load payments" action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<Wallet className="size-5" />} title="No payments yet" message="Payments appear here once Razorpay sends a real payment webhook." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((p) => (
              <TableRow key={p.billingEventId}>
                <TableCell>
                  {p.tenantId ? (
                    <Link href={`/super-admin/tenants/${p.tenantId}`} className="font-medium text-foreground hover:underline">
                      {p.tenantName ?? p.tenantId}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.razorpayPaymentId}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.razorpaySubscriptionId ?? "-"}</TableCell>
                <TableCell className="font-medium text-foreground">{p.amount != null ? formatCurrency(p.amount) : "-"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "muted"}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
