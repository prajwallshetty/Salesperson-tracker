"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BarChart3, Users2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignMembersModal } from "@/components/territories/AssignMembersModal";
import type { Territory, TerritoryPerformance } from "@/types";

export default function TerritoryPerformancePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [data, setData] = useState<TerritoryPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    api
      .get(`/territories/${id}/performance`)
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load territory performance"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const asTerritory: Territory | null = data
    ? {
        id: data.territoryId,
        name: data.territoryName,
        description: null,
        createdAt: "",
        _count: { salespersons: data.salespersonCount, customers: data.customerCount },
      }
    : null;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/territories")} className="-ml-2">
        <ArrowLeft /> Back to Territories
      </Button>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : error || !data ? (
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="Couldn't load territory performance"
          message="Something went wrong reaching the server."
          action={
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.territoryName}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Month-to-date performance &middot; {formatDate(data.period.gte)} → {formatDate(data.period.lte)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setAssigning(true)}>
              <Users2 /> Assign members
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Salespersons" value={formatNumber(data.salespersonCount)} />
            <StatCard label="Customers" value={formatNumber(data.customerCount)} />
            <StatCard label="Sales" value={formatCurrency(data.totals.sales)} />
            <StatCard label="Orders" value={formatNumber(data.totals.orders)} />
            <StatCard label="Visits" value={formatNumber(data.totals.visits)} />
            <StatCard label="Collections" value={formatCurrency(data.totals.collections)} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Target achievement</p>
              <span className="text-sm font-semibold text-foreground">{data.totals.achievementPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.min(100, data.totals.achievementPercent)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatCurrency(data.totals.sales)} of {formatCurrency(data.totals.targetAmount)} target
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Collections</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Achievement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.salespersons.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-10">
                    <EmptyState title="No salespersons in this territory" message="Assign a salesperson to start tracking performance here." />
                  </TableCell>
                </TableRow>
              ) : (
                data.salespersons.map((sp) => (
                  <TableRow key={sp.salespersonId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={sp.name} src={sp.avatarUrl} size="sm" />
                        <span className="font-medium text-foreground">{sp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-foreground">{formatCurrency(sp.sales)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(sp.orders)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(sp.visits)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(sp.collections)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(sp.targetAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={sp.achievementPercent >= 100 ? "success" : sp.achievementPercent >= 50 ? "warning" : "danger"}>
                        {sp.achievementPercent}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <AssignMembersModal open={assigning} territory={asTerritory} onClose={() => setAssigning(false)} onAssigned={load} />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
