import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../../lib/api";
import { SelectField } from "../../components/FormField";
import { EmptyState } from "../../components/EmptyState";
import { RouteHistoryPanel } from "./RouteHistoryPanel";
import type { Salesperson } from "../../types";

export default function RouteHistory() {
  const [params, setParams] = useSearchParams();
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedId, setSelectedId] = useState(params.get("salespersonId") ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/salespersons", { params: { pageSize: 200 } })
      .then((res) => {
        const items: Salesperson[] = res.data.items ?? [];
        setSalespersons(items);
        if (!selectedId && items.length > 0) setSelectedId(items[0].id);
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load salespersons")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = salespersons.find((s) => s.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Route History</h1>
          <p className="text-sm text-slate-400">Replay a salesperson's travelled path for any day.</p>
        </div>
        <SelectField
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setParams({ salespersonId: e.target.value });
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
