"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, MoreHorizontal, Eye, Ban, CheckCircle2 } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import type { Paginated, PlatformTenantListItem } from "@/types";

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "danger" | "info"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "muted",
  EXPIRED: "danger",
  SUSPENDED: "danger",
};

export default function SuperAdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformTenantListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState<PlatformTenantListItem | null>(null);

  useEffect(() => setPage(1), [search, status]);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/tenants", { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load tenants"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, status, page]);

  const toggleStatus = async (t: PlatformTenantListItem) => {
    try {
      const next = t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await platformApi.patch(`/tenants/${t.id}/status`, { status: next });
      toast.success(`${t.name} ${next === "SUSPENDED" ? "suspended" : "activated"}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update tenant status"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Tenants" description="Every company using Sales Grid." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by company name..." className="w-full max-w-xs" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "SUSPENDED", label: "Suspended" },
          ]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Salespeople</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Renewal</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState icon={<Building2 className="size-5" />} title="Couldn't load tenants" message="Something went wrong reaching the server." action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState icon={<Building2 className="size-5" />} title="No tenants found" message="Try adjusting your filters." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/super-admin/tenants/${t.id}`} className="font-medium text-foreground hover:underline">
                    {t.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{t.slug}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.subscription?.planName ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={t.status === "ACTIVE" ? "success" : "danger"} dot>
                      {t.status === "ACTIVE" ? "Active" : "Suspended"}
                    </Badge>
                    {t.subscription && (
                      <Badge variant={STATUS_VARIANT[t.subscription.status] ?? "muted"}>{t.subscription.status}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.salespersonCount}</TableCell>
                <TableCell className="text-muted-foreground">{t.userCount}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(t.subscription?.currentPeriodEnd)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/super-admin/tenants/${t.id}`}>
                          <Eye /> View details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive={t.status === "ACTIVE"} onSelect={() => setToggling(t)}>
                        {t.status === "ACTIVE" ? (
                          <>
                            <Ban /> Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle2 /> Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!toggling}
        title={toggling?.status === "ACTIVE" ? `Suspend ${toggling?.name}?` : `Activate ${toggling?.name}?`}
        message={
          toggling?.status === "ACTIVE"
            ? "This restricts the tenant's access to the app immediately. Their data is never deleted, and reactivating restores access instantly."
            : `${toggling?.name} will be able to access their workspace again.`
        }
        tone={toggling?.status === "ACTIVE" ? "danger" : "brand"}
        confirmLabel={toggling?.status === "ACTIVE" ? "Suspend" : "Activate"}
        onClose={() => setToggling(null)}
        onConfirm={() => (toggling ? toggleStatus(toggling) : undefined)}
      />
    </div>
  );
}
