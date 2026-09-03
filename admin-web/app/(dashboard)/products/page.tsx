"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage, assetUrl } from "@/lib/api";
import { SearchInput } from "@/components/SearchInput";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SelectField } from "@/components/FormField";
import { formatCurrency } from "@/lib/format";
import { IconBox, IconEdit, IconEye, IconPlus, IconPower, IconTrash } from "@/components/icons";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Products</h1>
          <p className="text-sm text-slate-400">Manage your product catalog.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or SKU..." className="w-full max-w-xs" />
        <SelectField value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto max-w-[180px]">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <SelectField value={isActive} onChange={(e) => setIsActive(e.target.value)} className="w-auto max-w-[160px]">
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </SelectField>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState icon={<IconBox className="h-6 w-6" />} title="No products found" message="Try adjusting your filters or add a new product." />
                  </td>
                </tr>
              ) : (
                data.items.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/products/${p.id}`)} className="flex items-center gap-3 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                          {p.imageUrl ? (
                            <img src={assetUrl(p.imageUrl) ?? undefined} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <IconBox className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{p.name}</p>
                          <p className="truncate text-xs text-slate-400">{p.unit}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-500">{p.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-slate-100 text-slate-500 ring-slate-500/20"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/products/${p.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="View details"
                        >
                          <IconEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditing(p);
                            setModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToggling(p)}
                          className={`rounded-lg p-2 transition hover:bg-slate-100 ${
                            p.isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"
                          }`}
                          title={p.isActive ? "Deactivate" : "Activate"}
                        >
                          <IconPower className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
      </div>

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
