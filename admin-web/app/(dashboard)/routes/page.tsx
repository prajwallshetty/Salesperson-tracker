"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <PageHeader
        title="Route History"
        description="Replay a salesperson's travelled path for any day."
        actions={
          salespersons.length > 0 ? (
            <Select
              value={selectedId}
              onValueChange={(v) => {
                setSelectedId(v);
                router.replace(`/routes?salespersonId=${v}`);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select salesperson" />
              </SelectTrigger>
              <SelectContent>
                {salespersons.map((sp) => (
                  <SelectItem key={sp.id} value={sp.id}>
                    {sp.user.name} &middot; {sp.employeeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : !selected ? (
        <EmptyState title="No salespersons available" />
      ) : (
        <RouteHistoryPanel salespersonId={selected.id} salespersonName={selected.user.name} />
      )}
    </div>
  );
}
