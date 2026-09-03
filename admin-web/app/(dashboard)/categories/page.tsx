"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Power, Trash2, Boxes, Package } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategoryModal } from "@/components/categories/CategoryModal";
import type { Category } from "@/types";

export default function CategoriesListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toggling, setToggling] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/categories", { params: { search: search || undefined, isActive: isActive || undefined } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load categories"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, isActive]);

  const toggleActive = async (c: Category) => {
    try {
      await api.patch(`/categories/${c.id}/status`, { isActive: !c.isActive });
      toast.success(`${c.name} ${c.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update category status"));
    }
  };

  const deleteCategory = async (c: Category) => {
    try {
      await api.delete(`/categories/${c.id}`);
      toast.success(`${c.name} deleted`);
      load();
    } catch (err) {
      // 409 when products still reference this category's name — surface the
      // server's exact message rather than a generic one.
      toast.error(apiErrorMessage(err, "Failed to delete category"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Group products for filtering and reporting."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus /> Add Category
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories..." className="w-full max-w-xs" />
        <FilterSelect
          value={isActive}
          onChange={setIsActive}
          placeholder="All statuses"
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead>Status</TableHead>
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
                  icon={<Boxes className="size-5" />}
                  title="Couldn't load categories"
                  message="Something went wrong reaching the server."
                  action={
                    <Button variant="outline" size="sm" onClick={load}>
                      Retry
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-10">
                <EmptyState
                  icon={<Boxes className="size-5" />}
                  title="No categories found"
                  message="Try adjusting your filters or add a new category."
                />
              </TableCell>
            </TableRow>
          ) : (
            items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{c.description ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => router.push(`/products?category=${encodeURIComponent(c.name)}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary transition hover:bg-primary-soft"
                  >
                    <Package className="size-3.5" /> {c.productCount}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "success" : "muted"} dot>
                    {c.isActive ? "Active" : "Inactive"}
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
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(c);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive={c.isActive} onSelect={() => setToggling(c)}>
                        <Power /> {c.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setDeleting(c)}>
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

      <CategoryModal open={modalOpen} category={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.isActive ? "Deactivate category?" : "Activate category?"}
        message={toggling ? `${toggling.name} will be marked ${toggling.isActive ? "inactive" : "active"}.` : ""}
        tone={toggling?.isActive ? "danger" : "brand"}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onClose={() => setToggling(null)}
        onConfirm={() => (toggling ? toggleActive(toggling) : undefined)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete category?"
        message={deleting ? `This will permanently delete "${deleting.name}". This cannot be undone.` : ""}
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? deleteCategory(deleting) : undefined)}
      />
    </div>
  );
}
