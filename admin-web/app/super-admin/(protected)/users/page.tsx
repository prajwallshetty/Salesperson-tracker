"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Users as UsersIcon, Ban, CheckCircle2 } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import type { Paginated, PlatformUserItem } from "@/types";

const PAGE_SIZE = 20;

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformUserItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState<PlatformUserItem | null>(null);

  useEffect(() => setPage(1), [search, role, status]);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/users", { params: { search: search || undefined, role: role || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load users"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, role, status, page]);

  const toggleStatus = async (u: PlatformUserItem) => {
    try {
      await platformApi.patch(`/users/${u.id}/status`, { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? "disabled" : "enabled"}.`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update user"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Every tenant-side user across the whole platform." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="w-full max-w-xs" />
        <FilterSelect
          value={role}
          onChange={setRole}
          placeholder="All roles"
          options={[
            { value: "ADMIN", label: "Admin" },
            { value: "SALESPERSON", label: "Salesperson" },
          ]}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Disabled" },
          ]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last login</TableHead>
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
                <EmptyState icon={<UsersIcon className="size-5" />} title="Couldn't load users" action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState icon={<UsersIcon className="size-5" />} title="No users found" message="Try adjusting your filters." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Link href={`/super-admin/tenants/${u.tenantId}`} className="text-foreground hover:underline">
                    {u.tenantName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.role}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "success" : "danger"} dot>
                    {u.isActive ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setToggling(u)}>
                    {u.isActive ? (
                      <>
                        <Ban className="size-3.5" /> Disable
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" /> Enable
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!toggling}
        title={toggling?.isActive ? `Disable ${toggling?.name}?` : `Enable ${toggling?.name}?`}
        message={
          toggling?.isActive
            ? "They immediately lose access to their workspace. This never deletes their data, and re-enabling restores access instantly."
            : `${toggling?.name} will be able to sign in again.`
        }
        tone={toggling?.isActive ? "danger" : "brand"}
        confirmLabel={toggling?.isActive ? "Disable" : "Enable"}
        onClose={() => setToggling(null)}
        onConfirm={() => (toggling ? toggleStatus(toggling) : undefined)}
      />
    </div>
  );
}
