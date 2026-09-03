"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Package, Pencil } from "lucide-react";
import { api, apiErrorMessage, assetUrl } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    return <EmptyState icon={<Package className="size-5" />} title="Product not found" />;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/products")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Products
      </button>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(product.imageUrl) ?? undefined} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <Package className="size-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">{product.name}</h1>
                <Badge variant={product.isActive ? "success" : "muted"} dot>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {product.sku} &middot; {product.category} &middot; {product.unit}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push("/products")}>
            <Pencil /> Edit from list
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold text-foreground">Pricing</p>
            <InfoRow label="Price" value={formatCurrency(product.price)} />
            <InfoRow label="Tax" value={`${product.taxPercent}%`} />
            <InfoRow label="Discount" value={`${product.discountPercent}%`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold text-foreground">Catalog Info</p>
            <InfoRow label="SKU" value={product.sku} />
            <InfoRow label="Category" value={product.category} />
            <InfoRow label="Unit" value={product.unit} />
            <InfoRow label="Added" value={formatDateTime(product.createdAt)} />
            <InfoRow label="Last updated" value={formatDateTime(product.updatedAt)} />
          </CardContent>
        </Card>
        {product.description && (
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <p className="mb-2 text-sm font-semibold text-foreground">Description</p>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
