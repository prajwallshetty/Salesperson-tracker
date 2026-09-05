"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Power, KeyRound, ShieldCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserModal } from "@/components/users/UserModal";
import { EditUserModal } from "@/components/users/EditUserModal";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { AccessCodeControl } from "@/components/users/AccessCodeControl";
import { formatDate } from "@/lib/format";
import type { Paginated, UserAccount } from "@/types";

const PAGE_SIZE = 15;

export default function UsersListPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [accessCodeStatus, setAccessCodeStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<UserAccount> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const [toggling, setToggling] = useState<UserAccount | null>(null);
  const [regenerating, setRegenerating] = useState<UserAccount | null>(null);

  useEffect(() => setPage(1), [search, role, isActive, accessCodeStatus]);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/users", {
        params: {
          search: search || undefined,
          role: role || undefined,
          isActive: isActive || undefined,
          accessCodeStatus: accessCodeStatus || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load users"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, role, isActive, accessCodeStatus, page]);

  const toggleActive = async (u: UserAccount) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update user status"));
    }
  };

  const handleRegenerateCode = async (u: UserAccount) => {
    try {
      await api.post(`/users/${u.id}/access-code/regenerate`);
      toast.success(`New access code generated for ${u.name}`);
      setRegenerating(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to regenerate access code"));
    }
  };

  const toggleAccessCodeEnabled = async (u: UserAccount) => {
    const currentlyEnabled = u.salesperson?.accessCodeEnabled ?? true;
    try {
      await api.patch(`/users/${u.id}/access-code`, { enabled: !currentlyEnabled });
      toast.success(`Access code ${currentlyEnabled ? "disabled" : "enabled"} for ${u.name}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update access code status"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & Roles"
        description="Manage login accounts, roles, and field salesperson Access Codes."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" /> Add User
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, phone..."
          className="w-full max-w-xs"
        />

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
          value={isActive}
          onChange={setIsActive}
          placeholder="All statuses"
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />

        <FilterSelect
          value={accessCodeStatus}
          onChange={setAccessCodeStatus}
          placeholder="Access code status"
          options={[
            { value: "ENABLED", label: "Access Code Enabled" },
            { value: "DISABLED", label: "Access Code Disabled" },
          ]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Access</TableHead>
            <TableHead>Employee Code</TableHead>
            <TableHead>Territory</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState
                  icon={<ShieldCheck className="size-5" />}
                  title="Couldn't load users"
                  message="Something went wrong reaching the server."
                  action={
                    <Button variant="outline" size="sm" onClick={load}>
                      Retry
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState
                  icon={<ShieldCheck className="size-5" />}
                  title="No users found"
                  message="Try adjusting your search or filters."
                />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email || u.phone || "-"}</p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "info" : "default"}>{u.role}</Badge>
                </TableCell>

                <TableCell>
                  {u.role === "SALESPERSON" || u.salesperson ? (
                    <AccessCodeControl userId={u.id} compact onUpdate={load} />
                  ) : (
                    <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                      Admin Password
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground">{u.salesperson?.employeeCode ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{u.salesperson?.territory?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>

                <TableCell>
                  <Badge variant={u.isActive ? "success" : "muted"} dot>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(u)}>
                        <Pencil className="size-4 mr-2" /> Edit Details
                      </DropdownMenuItem>

                      {u.role === "ADMIN" ? (
                        <DropdownMenuItem onSelect={() => setResetting(u)}>
                          <KeyRound className="size-4 mr-2" /> Reset Password
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onSelect={() => setRegenerating(u)}>
                            <RefreshCw className="size-4 mr-2" /> Regenerate Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleAccessCodeEnabled(u)}>
                            <ShieldAlert className="size-4 mr-2" />
                            {u.salesperson?.accessCodeEnabled === false ? "Enable Access Code" : "Disable Access Code"}
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem destructive={u.isActive} onSelect={() => setToggling(u)}>
                        <Power className="size-4 mr-2" /> {u.isActive ? "Deactivate Account" : "Activate Account"}
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

      <UserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <EditUserModal open={!!editing} user={editing} onClose={() => setEditing(null)} onSaved={load} />
      {resetting && <ResetPasswordDialog open={!!resetting} user={resetting} onClose={() => setResetting(null)} />}

      <ConfirmDialog
        open={!!toggling}
        title={toggling?.isActive ? "Deactivate user account?" : "Activate user account?"}
        message={
          toggling
            ? toggling.isActive
              ? `${toggling.name} will be signed out immediately and unable to log in until reactivated.`
              : `${toggling.name} will be able to log in again.`
            : ""
        }
        tone={toggling?.isActive ? "danger" : "brand"}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onClose={() => setToggling(null)}
        onConfirm={() => (toggling ? toggleActive(toggling) : undefined)}
      />

      <ConfirmDialog
        open={!!regenerating}
        title="Regenerate Access Code?"
        message={
          regenerating
            ? `The current access code for ${regenerating.name} will stop working immediately. Share the new code with them to log back into the Sales App.`
            : ""
        }
        tone="danger"
        confirmLabel="Regenerate Code"
        onClose={() => setRegenerating(null)}
        onConfirm={() => (regenerating ? handleRegenerateCode(regenerating) : undefined)}
      />
    </div>
  );
}
