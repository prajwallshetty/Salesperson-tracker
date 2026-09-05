"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Webhook } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/format";
import type { Paginated, PlatformBillingEventItem } from "@/types";

const PAGE_SIZE = 25;

export default function SuperAdminBillingEventsPage() {
  const [processed, setProcessed] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformBillingEventItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => setPage(1), [processed]);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/billing-events", { params: { processed: processed || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load billing events"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [processed, page]);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    platformApi
      .get(`/billing-events/${id}`)
      .then((res) => setDetail(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load event")))
      .finally(() => setDetailLoading(false));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Billing Events" description="Raw Razorpay webhook deliveries - signature-verified, idempotent." />

      <FilterSelect
        value={processed}
        onChange={setProcessed}
        placeholder="All events"
        options={[
          { value: "true", label: "Processed" },
          { value: "false", label: "Unprocessed" },
        ]}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event type</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Processed</TableHead>
            <TableHead>Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-10">
                <EmptyState icon={<Webhook className="size-5" />} title="Couldn't load events" action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-10">
                <EmptyState icon={<Webhook className="size-5" />} title="No billing events yet" />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => openDetail(e.id)}>
                <TableCell className="font-medium text-foreground">{e.eventType}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.tenantId ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={e.processed ? "success" : "warning"}>{e.processed ? "Processed" : "Pending"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Billing event</SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <pre className="mt-4 max-h-[80vh] overflow-auto rounded-xl bg-muted p-4 text-xs">{JSON.stringify(detail, null, 2)}</pre>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
