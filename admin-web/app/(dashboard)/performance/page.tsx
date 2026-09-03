"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { IconChart } from "@/components/icons";
import { PerformanceDetailDrawer } from "@/components/performance/PerformanceDetailDrawer";
import { cn } from "@/lib/utils";
import type { PerformanceLeaderboardRow } from "@/types";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const RANK_STYLE: Record<number, string> = {
  1: "bg-warning-soft text-warning",
  2: "bg-muted text-muted-foreground",
  3: "bg-secondary text-secondary-foreground",
};

export default function PerformancePage() {
  const [range, setRange] = useState("month");
  const [items, setItems] = useState<PerformanceLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PerformanceLeaderboardRow | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/performance", { params: { range } })
      .then((res) => setItems(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load leaderboard")))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performance Leaderboard"
        description="Compare salesperson performance across periods."
        actions={
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.key} value={r.key}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Visits</TableHead>
            <TableHead className="text-right">Collections</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-10">
                <EmptyState icon={<IconChart className="size-5" />} title="No performance data" message="Data will appear once field activity is recorded for this period." />
              </TableCell>
            </TableRow>
          ) : (
            items.map((row) => (
              <TableRow key={row.salespersonId} onClick={() => setSelected(row)} className="cursor-pointer">
                <TableCell>
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                      RANK_STYLE[row.rank] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {row.rank}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                    <span className="font-medium text-foreground">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(row.sales)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatNumber(row.orders)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatNumber(row.visits)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(row.collections)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PerformanceDetailDrawer
        salespersonId={selected?.salespersonId ?? null}
        name={selected?.name}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
