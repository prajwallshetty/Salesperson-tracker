import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Territory } from "../types";

// Same shared-cache pattern as useSalespersonOptions — this list only feeds filter/assign
// dropdowns across several pages (Pricing, Territories, Attendance, Targets, Visits,
// Customers, Salespersons) and changes rarely.
const CACHE_TTL_MS = 60_000;
let cache: { data: Territory[]; fetchedAt: number } | null = null;
let inflight: Promise<Territory[]> | null = null;
const listeners = new Set<(data: Territory[]) => void>();

function isFresh() {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

function fetchOptions(): Promise<Territory[]> {
  if (isFresh()) return Promise.resolve(cache!.data);
  if (inflight) return inflight;
  inflight = api
    .get("/territories")
    .then((res) => {
      const data: Territory[] = res.data ?? [];
      cache = { data, fetchedAt: Date.now() };
      listeners.forEach((l) => l(data));
      return data;
    })
    .catch(() => {
      const data: Territory[] = [];
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateTerritoryOptions() {
  cache = null;
}

export function useTerritoryOptions() {
  const [options, setOptions] = useState<Territory[]>(cache?.data ?? []);

  useEffect(() => {
    listeners.add(setOptions);
    fetchOptions().then(setOptions);
    return () => {
      listeners.delete(setOptions);
    };
  }, []);

  return options;
}
