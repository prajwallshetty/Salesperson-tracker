import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Salesperson } from "../types";

export function useSalespersonOptions() {
  const [options, setOptions] = useState<Salesperson[]>([]);

  useEffect(() => {
    api
      .get("/salespersons", { params: { pageSize: 200 } })
      .then((res) => setOptions(res.data.items ?? []))
      .catch(() => setOptions([]));
  }, []);

  return options;
}
