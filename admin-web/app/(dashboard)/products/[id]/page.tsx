"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage, assetUrl } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { IconBox, IconEdit } from "@/components/icons";
import type { Product } from "@/types";

// The product catalog is small and has no dedicated single-product GET endpoint, so this
// detail view fetches the full list and finds the matching product by id. Editing remains
// on the Products list (inline edit modal) — this page is a read-only detail view.
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get("/products", { params: { pageSize: 500 } })
      .then((res) => {
        const items: Product[] = res.data.items ?? [];
        const found = items.find((p) => p.id === id) ?? null;
        setProduct(found);
        setNotFound(!found);
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load product")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !product) {
    return <EmptyState icon={<IconBox className="h-6 w-6" />} title="Product not found" />;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/products")} className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Back to Products
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
            {product.imageUrl ? (
              <img src={assetUrl(product.imageUrl) ?? undefined} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <IconBox className="h-8 w-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-800">{product.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  product.isActive
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                    : "bg-slate-100 text-slate-500 ring-slate-500/20"
                }`}
              >
                {product.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {product.sku} &middot; {product.category} &middot; {product.unit}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <IconEdit className="h-4 w-4" /> Edit from list
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="mb-2 text-sm font-semibold text-slate-700">Pricing</p>
          <InfoRow label="Price" value={formatCurrency(product.price)} />
          <InfoRow label="Tax" value={`${product.taxPercent}%`} />
          <InfoRow label="Discount" value={`${product.discountPercent}%`} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="mb-2 text-sm font-semibold text-slate-700">Catalog Info</p>
          <InfoRow label="SKU" value={product.sku} />
          <InfoRow label="Category" value={product.category} />
          <InfoRow label="Unit" value={product.unit} />
          <InfoRow label="Added" value={formatDateTime(product.createdAt)} />
          <InfoRow label="Last updated" value={formatDateTime(product.updatedAt)} />
        </div>
        {product.description && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
            <p className="mb-2 text-sm font-semibold text-slate-700">Description</p>
            <p className="text-sm text-slate-600">{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
