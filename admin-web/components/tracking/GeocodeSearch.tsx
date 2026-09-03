"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

// Module-level so the throttle applies across every mount of this component, not just
// within one instance's lifetime.
let lastRequestAt = 0;

// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// asks for a max of ~1 request/second and an identifying User-Agent. Browsers treat
// User-Agent as a forbidden header that JS cannot set on fetch/XHR (the browser's own
// UA string is sent instead, which is what the policy expects from browser-based
// clients — it explicitly calls out the HTTP Referer as the identifying signal for
// in-browser apps, which the browser also attaches automatically). So there's nothing
// extra to set here beyond respecting the rate limit, which this throttle enforces
// regardless of how fast the caller (debounced input) fires.
async function searchPlaces(query: string, signal: AbortSignal): Promise<GeocodeResult[]> {
  const wait = Math.max(0, 1000 - (Date.now() - lastRequestAt));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Geocoding request failed");
  const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
  return data.map((d) => ({ displayName: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

interface GeocodeSearchProps {
  onSelect: (result: GeocodeResult) => void;
  className?: string;
}

export function GeocodeSearch({ onSelect, className }: GeocodeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    // Debounced well past the 1 req/sec ceiling so a fast typist doesn't queue up a
    // burst of requests that the throttle above would otherwise just delay anyway.
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      searchPlaces(q, controller.signal)
        .then((res) => {
          setResults(res);
          setOpen(true);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setError(true);
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/95 px-3 py-2 shadow-card backdrop-blur">
        {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <Search className="size-4 shrink-0 text-muted-foreground" />}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a place or address..."
          className="w-56 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:w-64"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute left-0 right-0 top-full z-[500] mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-card shadow-card-hover">
          {error ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">Couldn&apos;t reach the geocoding service.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                }}
                className="block w-full truncate border-b border-border/40 px-3 py-2.5 text-left text-xs text-foreground last:border-b-0 hover:bg-muted/60"
                title={r.displayName}
              >
                {r.displayName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
