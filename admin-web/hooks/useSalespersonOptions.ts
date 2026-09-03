import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Salesperson } from "../types";

// Shared across every page that uses this hook (Orders, Quotations,
// Collections, Visits, Follow-ups, Leads, Customers) — this list is only
// used to populate a "salesperson" filter dropdown and changes rarely, so
// there's no need to re-fetch it on every page navigation. A short TTL keeps
// it reasonably fresh (e.g. after adding a salesperson) without adding a
// full cache-invalidation mechanism.
const CACHE_TTL_MS = 60_000;
let cache: { data: Salesperson[]; fetchedAt: number } | null = null;
let inflight: Promise<Salesperson[]> | null = null;
const listeners = new Set<(data: Salesperson[]) => void>();

function isFresh() {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

function fetchOptions(): Promise<Salesperson[]> {
  if (isFresh()) return Promise.resolve(cache!.data);
  if (inflight) return inflight;
  inflight = api
    .get("/salespersons", { params: { pageSize: 200 } })
    .then((res) => {
      const data: Salesperson[] = res.data.items ?? [];
      cache = { data, fetchedAt: Date.now() };
      listeners.forEach((l) => l(data));
      return data;
    })
    .catch(() => {
      const data: Salesperson[] = [];
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSalespersonOptions() {
  const [options, setOptions] = useState<Salesperson[]>(cache?.data ?? []);

  useEffect(() => {
    listeners.add(setOptions);
    fetchOptions().then(setOptions);
    return () => {
      listeners.delete(setOptions);
    };
  }, []);

  return options;
}
