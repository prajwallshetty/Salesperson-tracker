import { Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PerformerRow {
  salespersonId: string;
  name: string;
  avatarUrl: string | null;
  sales: number;
}

const MEDAL: Record<number, string> = {
  0: "bg-amber-100 text-amber-700",
  1: "bg-slate-200 text-slate-600",
  2: "bg-orange-100 text-orange-700",
};

export function TopPerformers({ items, loading }: { items: PerformerRow[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={<Trophy className="size-5" />} title="No sales yet" message="Leaderboard appears once sales are recorded." />;
  }

  const max = Math.max(...items.map((p) => p.sales), 1);

  return (
    <div className="space-y-1">
      {items.map((p, i) => (
        <div key={p.salespersonId} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/60">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              MEDAL[i] ?? "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}
          </span>
          <Avatar name={p.name} src={p.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
            <Progress value={(p.sales / max) * 100} className="mt-1 h-1.5" />
          </div>
          <span className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(p.sales)}</span>
        </div>
      ))}
    </div>
  );
}
