"use client";

import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface MarkerEntry {
  marker: mapboxgl.Marker;
  current: [number, number]; // [lng, lat]
  target: [number, number];
  raf: number | null;
}

/**
 * Keeps a set of mapboxgl.Marker instances keyed by id and smoothly interpolates each
 * one's position on update instead of jumping - critically, moving one marker never
 * touches React state or re-renders anything: markers are mutated directly via
 * marker.setLngLat() inside a per-marker requestAnimationFrame loop. Use `upsert` for
 * both "create if missing" and "move if present" so callers don't need their own
 * add-vs-update branching.
 */
export function useAnimatedMarkers() {
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

  const animate = useCallback((id: string, durationMs = 1400) => {
    const entry = markersRef.current.get(id);
    if (!entry) return;
    if (entry.raf !== null) cancelAnimationFrame(entry.raf);
    const from = entry.current;
    const to = entry.target;
    if (from[0] === to[0] && from[1] === to[1]) return;
    const start = performance.now();
    const step = (now: number) => {
      const e = markersRef.current.get(id);
      if (!e) return;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t); // ease-out
      const next: [number, number] = [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased];
      e.current = next;
      e.marker.setLngLat(next);
      e.raf = t < 1 ? requestAnimationFrame(step) : null;
    };
    entry.raf = requestAnimationFrame(step);
  }, []);

  const upsert = useCallback(
    (id: string, lngLat: [number, number], createMarker: () => mapboxgl.Marker, map: mapboxgl.Map) => {
      const existing = markersRef.current.get(id);
      if (existing) {
        existing.target = lngLat;
        animate(id);
      } else {
        const marker = createMarker().setLngLat(lngLat).addTo(map);
        markersRef.current.set(id, { marker, current: lngLat, target: lngLat, raf: null });
      }
    },
    [animate]
  );

  const remove = useCallback((id: string) => {
    const entry = markersRef.current.get(id);
    if (entry) {
      if (entry.raf !== null) cancelAnimationFrame(entry.raf);
      entry.marker.remove();
      markersRef.current.delete(id);
    }
  }, []);

  const clearMissing = useCallback(
    (keepIds: Set<string>) => {
      markersRef.current.forEach((_entry, id) => {
        if (!keepIds.has(id)) remove(id);
      });
    },
    [remove]
  );

  const clear = useCallback(() => {
    markersRef.current.forEach((e) => {
      if (e.raf !== null) cancelAnimationFrame(e.raf);
      e.marker.remove();
    });
    markersRef.current.clear();
  }, []);

  const get = useCallback((id: string) => markersRef.current.get(id)?.marker, []);

  useEffect(() => clear, [clear]);

  return { upsert, remove, clear, clearMissing, get };
}
