"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Users2, Map as MapIcon, BarChart3 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TerritoryModal } from "@/components/territories/TerritoryModal";
import { AssignMembersModal } from "@/components/territories/AssignMembersModal";
import { invalidateTerritoryOptions } from "@/hooks/useTerritoryOptions";
import type { Territory } from "@/types";

export default function TerritoriesListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Territory | null>(null);
  const [assigning, setAssigning] = useState<Territory | null>(null);
  const [deleting, setDeleting] = useState<Territory | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/territories")
      .then((res) => setItems(res.data ?? []))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load territories"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const reload = () => {
    invalidateTerritoryOptions();
    load();
  };

  const deleteTerritory = async (t: Territory) => {
    try {
      await api.delete(`/territories/${t.id}`);
      toast.success(`${t.name} deleted`);
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete territory"));
    }
  };

  const filtered = items.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Territories"
        description="Geographic sales territories — assign salespersons and customers to each."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus /> Add Territory
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search territories..." className="w-full max-w-xs" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Territory</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Salespersons</TableHead>
            <TableHead className="text-right">Customers</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState
                  icon={<MapIcon className="size-5" />}
                  title="Couldn't load territories"
                  message="Something went wrong reaching the server."
                  action={
                    <Button variant="outline" size="sm" onClick={load}>
                      Retry
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState icon={<MapIcon className="size-5" />} title="No territories found" message="Add a territory to start assigning salespersons and customers." />
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/territories/${t.id}`)}>
                <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{t.description ?? "-"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{t._count?.salespersons ?? 0}</TableCell>
                <TableCell className="text-right text-muted-foreground">{t._count?.customers ?? 0}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => router.push(`/territories/${t.id}`)}>
                        <BarChart3 /> View performance
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setAssigning(t)}>
                        <Users2 /> Assign members
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(t);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setDeleting(t)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TerritoryModal open={modalOpen} territory={editing} onClose={() => setModalOpen(false)} onSaved={reload} />
      <AssignMembersModal open={!!assigning} territory={assigning} onClose={() => setAssigning(null)} onAssigned={load} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete territory?"
        message={
          deleting
            ? `This will permanently delete "${deleting.name}". ${
                (deleting._count?.salespersons ?? 0) + (deleting._count?.customers ?? 0) > 0
                  ? "It still has salespersons or customers assigned — the server may reject this."
                  : "This cannot be undone."
              }`
            : ""
        }
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? deleteTerritory(deleting) : undefined)}
      />
    </div>
  );
}
