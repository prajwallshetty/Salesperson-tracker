"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { SelectField } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import type { Salesperson } from "@/types";

const RouteHistoryPanel = dynamic(() => import("@/components/tracking/RouteHistoryPanel"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

export default function RouteHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("salespersonId") ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/salespersons", { params: { pageSize: 200 } })
      .then((res) => {
        const items: Salesperson[] = res.data.items ?? [];
        setSalespersons(items);
        setSelectedId((current) => current || (items.length > 0 ? items[0].id : ""));
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load salespersons")))
      .finally(() => setLoading(false));
  }, []);

  const selected = salespersons.find((s) => s.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Route History</h1>
          <p className="text-sm text-slate-400">Replay a salesperson&apos;s travelled path for any day.</p>
        </div>
        <SelectField
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            router.replace(`/routes?salespersonId=${e.target.value}`);
          }}
          className="w-64"
        >
          {salespersons.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.user.name} &middot; {sp.employeeCode}
            </option>
          ))}
        </SelectField>
      </div>

      {loading ? (
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
      ) : !selected ? (
        <EmptyState title="No salespersons available" />
      ) : (
        <RouteHistoryPanel salespersonId={selected.id} salespersonName={selected.user.name} />
      )}
    </div>
  );
}
