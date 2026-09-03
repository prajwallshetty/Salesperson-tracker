"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3 } from "lucide-react";

interface SalesChartProps {
  data: { date: string; total: number }[];
  targetPerDay?: number;
  loading?: boolean;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-popover">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function SalesChart({ data, targetPerDay, loading }: SalesChartProps) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (data.length === 0) {
    return <EmptyState icon={<BarChart3 className="size-5" />} title="No sales data yet" message="Sales trend will appear once orders come in." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -14, right: 12, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="hsl(240 18% 90%)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240 8% 46%)" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(240 8% 46%)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${v >= 1000 ? Math.round(v / 1000) + "k" : v}`}
          width={48}
        />
        {typeof targetPerDay === "number" && targetPerDay > 0 && (
          <ReferenceLine
            y={targetPerDay}
            stroke="hsl(38 92% 46%)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: "Target/day", position: "insideTopRight", fontSize: 10, fill: "hsl(38 92% 46%)" }}
          />
        )}
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(262 83% 58%)", strokeWidth: 1, strokeDasharray: "3 3" }} />
        <Area
          type="monotone"
          dataKey="total"
          name="Sales"
          stroke="hsl(262 83% 58%)"
          strokeWidth={2.5}
          fill="url(#salesFill)"
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
