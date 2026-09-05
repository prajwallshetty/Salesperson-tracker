"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import type { Paginated, PlatformSubscriptionListItem } from "@/types";

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "danger" | "info"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "muted",
  EXPIRED: "danger",
  SUSPENDED: "danger",
};

export default function SuperAdminSubscriptionsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformSubscriptionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => setPage(1), [status]);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/subscriptions", { params: { status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load subscriptions"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Subscriptions" description="Every tenant's subscription, across every plan." />

      <FilterSelect
        value={status}
        onChange={setStatus}
        placeholder="All statuses"
        options={[
          { value: "TRIALING", label: "Trialing" },
          { value: "ACTIVE", label: "Active" },
          { value: "PAST_DUE", label: "Past due" },
          { value: "CANCELLED", label: "Cancelled" },
          { value: "EXPIRED", label: "Expired" },
          { value: "SUSPENDED", label: "Suspended" },
        ]}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Interval</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Renewal / Trial end</TableHead>
            <TableHead>Razorpay ID</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState icon={<CreditCard className="size-5" />} title="Couldn't load subscriptions" action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState icon={<CreditCard className="size-5" />} title="No subscriptions found" />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/super-admin/tenants/${s.tenantId}`} className="font-medium text-foreground hover:underline">
                    {s.tenantName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.planName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[s.status] ?? "muted"}>{s.status}</Badge>
                  {s.cancelAtPeriodEnd && <span className="ml-1.5 text-xs text-muted-foreground">(ending)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{s.billingInterval === "YEARLY" ? "Yearly" : "Monthly"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.salespersonCount} / {s.maxSalespersons}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.status === "TRIALING" ? s.trialEnd : s.currentPeriodEnd)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.providerSubscriptionId ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
