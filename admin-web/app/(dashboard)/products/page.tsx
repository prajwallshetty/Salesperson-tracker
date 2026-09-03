"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Eye, Pencil, Power, Trash2, Package } from "lucide-react";
import { api, apiErrorMessage, assetUrl } from "@/lib/api";
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
import { formatCurrency } from "@/lib/format";
import { ProductModal } from "@/components/products/ProductModal";
import type { Paginated, Product } from "@/types";

const PAGE_SIZE = 10;

export default function ProductsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toggling, setToggling] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  useEffect(() => {
    api.get("/products/categories").then((res) => setCategories(res.data ?? []));
  }, []);

  useEffect(() => setPage(1), [search, category, isActive]);

  const load = () => {
    setLoading(true);
    api
      .get("/products", {
        params: {
          search: search || undefined,
          category: category || undefined,
          isActive: isActive || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load products")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, category, isActive, page]);

  const toggleActive = async (p: Product) => {
    try {
      await api.patch(`/products/${p.id}/status`, { isActive: !p.isActive });
      toast.success(`${p.name} ${p.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update product status"));
    }
  };

  const deleteProduct = async (p: Product) => {
    try {
      await api.delete(`/products/${p.id}`);
      toast.success(`${p.name} deleted`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete product"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Manage your product catalog."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus /> Add Product
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or SKU..." className="w-full max-w-xs" />
        <FilterSelect value={category} onChange={setCategory} placeholder="All categories" options={categories.map((c) => ({ value: c, label: c }))} />
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
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState icon={<Package className="size-5" />} title="No products found" message="Try adjusting your filters or add a new product." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <button onClick={() => router.push(`/products/${p.id}`)} className="flex items-center gap-3 text-left">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={assetUrl(p.imageUrl) ?? undefined} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.unit}</p>
                    </div>
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{formatCurrency(p.price)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{p.taxPercent}%</TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? "success" : "muted"} dot>
                    {p.isActive ? "Active" : "Inactive"}
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
                      <DropdownMenuItem onSelect={() => router.push(`/products/${p.id}`)}>
                        <Eye /> View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive={p.isActive} onSelect={() => setToggling(p)}>
                        <Power /> {p.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setDeleting(p)}>
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
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <ProductModal open={modalOpen} product={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.isActive ? "Deactivate product?" : "Activate product?"}
        message={toggling ? `${toggling.name} will be marked ${toggling.isActive ? "inactive" : "active"}.` : ""}
        tone={toggling?.isActive ? "danger" : "brand"}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onClose={() => setToggling(null)}
        onConfirm={() => (toggling ? toggleActive(toggling) : undefined)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete product?"
        message={deleting ? `This will permanently delete "${deleting.name}". This cannot be undone.` : ""}
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? deleteProduct(deleting) : undefined)}
      />
    </div>
  );
}
