"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Power, Tags } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PricingModal } from "@/components/pricing/PricingModal";
import { useTerritoryOptions } from "@/hooks/useTerritoryOptions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Paginated, PriceListEntry, Product } from "@/types";

const PAGE_SIZE = 10;

function scopeLabel(entry: PriceListEntry): string {
  if (entry.customer) return `Customer: ${entry.customer.name}`;
  if (entry.territory) return `Territory: ${entry.territory.name}`;
  return "Generic (all)";
}

export default function PricingListPage() {
  const territories = useTerritoryOptions();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PriceListEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceListEntry | null>(null);
  const [deactivating, setDeactivating] = useState<PriceListEntry | null>(null);

  useEffect(() => {
    api.get("/products", { params: { pageSize: 200 } }).then((res) => setProducts(res.data.items ?? []));
  }, []);

  useEffect(() => setPage(1), [productId, territoryId, isActive]);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/pricing", {
        params: {
          productId: productId || undefined,
          territoryId: territoryId || undefined,
          isActive: isActive || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load price list"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [productId, territoryId, isActive, page]);

  const deactivate = async (entry: PriceListEntry) => {
    try {
      await api.patch(`/pricing/${entry.id}/deactivate`);
      toast.success("Price override deactivated");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to deactivate price override"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pricing"
        description="Per-product price, discount and tax overrides for territories or specific customers."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus /> Add Override
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={productId}
          onChange={setProductId}
          placeholder="All products"
          options={products.map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterSelect
          value={territoryId}
          onChange={setTerritoryId}
          placeholder="All territories"
          options={territories.map((t) => ({ value: t.id, label: t.name }))}
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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead>Effective</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-10">
                <EmptyState
                  icon={<Tags className="size-5" />}
                  title="Couldn't load pricing"
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
                  icon={<Tags className="size-5" />}
                  title="No price overrides found"
                  message="Try adjusting your filters or add a new price override."
                />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{entry.product?.name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{entry.product?.sku}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{scopeLabel(entry)}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{formatCurrency(entry.price)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{entry.discountPercent}%</TableCell>
                <TableCell className="text-right text-muted-foreground">{entry.taxPercent}%</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(entry.effectiveFrom)} {entry.effectiveTo ? `→ ${formatDate(entry.effectiveTo)}` : "→ ongoing"}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.isActive ? "success" : "muted"} dot>
                    {entry.isActive ? "Active" : "Inactive"}
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
                          setEditing(entry);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      {entry.isActive && (
                        <DropdownMenuItem destructive onSelect={() => setDeactivating(entry)}>
                          <Power /> Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <PricingModal open={modalOpen} entry={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate price override?"
        message={
          deactivating
            ? `This override for ${deactivating.product?.name ?? "this product"} will stop applying immediately. The backend has no endpoint to reactivate it — you'll need to create a new override.`
            : ""
        }
        confirmLabel="Deactivate"
        tone="danger"
        onClose={() => setDeactivating(null)}
        onConfirm={() => (deactivating ? deactivate(deactivating) : undefined)}
      />
    </div>
  );
}
