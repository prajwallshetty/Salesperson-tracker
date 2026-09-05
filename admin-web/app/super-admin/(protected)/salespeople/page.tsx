"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MapPinned } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { Paginated, PlatformSalespersonItem } from "@/types";

const PAGE_SIZE = 20;

const FIELD_WORK_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  ACTIVE: "In the field",
  ENDED: "Ended for today",
};

export default function SuperAdminSalespeoplePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformSalespersonItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => setPage(1), [search, status]);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/salespersons", { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load salespeople"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, status, page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Salespeople" description="Read-only, platform-wide view. Tenant business data is managed by each tenant, not here." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or employee code..." className="w-full max-w-xs" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Access code</TableHead>
            <TableHead>Field work</TableHead>
            <TableHead>Last activity</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState icon={<MapPinned className="size-5" />} title="Couldn't load salespeople" action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState icon={<MapPinned className="size-5" />} title="No salespeople found" message="Try adjusting your filters." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-foreground">
                  {s.name} <span className="font-mono text-xs text-muted-foreground">{s.employeeCode}</span>
                </TableCell>
                <TableCell>
                  <Link href={`/super-admin/tenants/${s.tenantId}`} className="text-foreground hover:underline">
                    {s.tenantName}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={s.status === "ACTIVE" ? "success" : "muted"} dot>
                      {s.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                    {s.isOnline && <Badge variant="info">Online now</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.accessCodeEnabled ? "Enabled" : "Disabled"}</TableCell>
                <TableCell className="text-muted-foreground">{FIELD_WORK_LABEL[s.fieldWorkStatus]}</TableCell>
                <TableCell className="text-muted-foreground">{s.lastSeenAt ? formatDateTime(s.lastSeenAt) : "No activity yet"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(s.joinedAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
