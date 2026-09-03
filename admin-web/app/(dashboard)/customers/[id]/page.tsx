"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, UserCheck, Footprints, ShoppingCart, Wallet, Activity as ActivityIcon } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Customer } from "@/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load customer")))
      .finally(() => setLoading(false));
  }, [id]);

  const totals = useMemo(() => {
    const orders = customer?.orders ?? [];
    const collections = customer?.collections ?? [];
    const totalSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
    return { totalSales, totalCollected, outstanding: Math.max(0, totalSales - totalCollected) };
  }, [customer]);

  const activity = useMemo(() => {
    if (!customer) return [];
    const items: { id: string; at: string; label: string; icon: typeof Footprints }[] = [];
    (customer.visits ?? []).forEach((v) =>
      items.push({ id: `v-${v.id}`, at: v.checkInAt ?? v.createdAt, label: `Visit ${v.status.toLowerCase()}`, icon: Footprints })
    );
    (customer.orders ?? []).forEach((o) =>
      items.push({ id: `o-${o.id}`, at: o.createdAt, label: `Order ${o.number} · ${formatCurrency(o.grandTotal)}`, icon: ShoppingCart })
    );
    (customer.collections ?? []).forEach((c) =>
      items.push({ id: `c-${c.id}`, at: c.collectedAt, label: `Payment collected · ${formatCurrency(c.amount)}`, icon: Wallet })
    );
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 15);
  }, [customer]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return <EmptyState icon={<UserCheck className="size-5" />} title="Customer not found" />;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/customers")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Customers
      </button>

      <Card>
        <CardContent className="p-5">
          <h1 className="text-lg font-bold tracking-tight text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.territory?.name ?? "Unassigned territory"} &middot; {customer.salesperson?.user?.name ?? "Unassigned salesperson"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total Sales" value={formatCurrency(totals.totalSales)} />
        <StatTile label="Total Collected" value={formatCurrency(totals.totalCollected)} />
        <StatTile label="Outstanding" value={formatCurrency(totals.outstanding)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <InfoRow label="Phone" value={customer.phone ?? "-"} />
              <InfoRow label="Email" value={customer.email ?? "-"} />
              <InfoRow label="Address" value={customer.address ?? "-"} />
              <InfoRow label="Location" value={customer.lat && customer.lng ? `${customer.lat.toFixed(5)}, ${customer.lng.toFixed(5)}` : "-"} />
              {customer.notes && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="rounded-xl bg-muted/60 p-3 text-sm text-foreground">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            {!customer.visits || customer.visits.length === 0 ? (
              <CardContent className="p-6">
                <EmptyState title="No visits yet" />
              </CardContent>
            ) : (
              <div className="divide-y divide-border/50">
                {customer.visits.map((v) => (
                  <div key={v.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{v.checkInAt ? formatDateTime(v.checkInAt) : "Planned"}</p>
                      <StatusBadge status={v.status} />
                    </div>
                    {v.outcome && <p className="mt-0.5 text-xs text-muted-foreground">{v.outcome.replace(/_/g, " ")}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            {!customer.orders || customer.orders.length === 0 ? (
              <CardContent className="p-6">
                <EmptyState title="No orders yet" />
              </CardContent>
            ) : (
              <div className="divide-y divide-border/50">
                {customer.orders.map((o) => (
                  <div key={o.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{o.number}</p>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(o.grandTotal)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            {!customer.collections || customer.collections.length === 0 ? (
              <CardContent className="p-6">
                <EmptyState title="No collections yet" />
              </CardContent>
            ) : (
              <div className="divide-y divide-border/50">
                {customer.collections.map((c) => (
                  <div key={c.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{c.method.replace(/_/g, " ")}</p>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(c.amount)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(c.collectedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            {activity.length === 0 ? (
              <CardContent className="p-6">
                <EmptyState icon={<ActivityIcon className="size-5" />} title="No activity yet" />
              </CardContent>
            ) : (
              <div className="divide-y divide-border/50">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <item.icon className="size-4" />
                    </span>
                    <p className="flex-1 text-sm text-foreground">{item.label}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(item.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
