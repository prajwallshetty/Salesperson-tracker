import type { StyleSpecification } from "maplibre-gl";

/**
 * Mirrors admin-web/lib/maps/basemap.ts - kept in sync manually since the two Next.js apps
 * are separate packages with no shared workspace for browser-only UI code. Raw OpenStreetMap
 * raster tiles: no API key, no account, no rate-limited tier (CARTO's basemap tiles now
 * require a free key as of an August 2026 policy change - not worth the extra moving part for
 * this app's lightweight "where am I / where are my nearby customers" map).
 */
export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
};

export const DEFAULT_MAP_CENTER: [number, number] = [77.5946, 12.9716]; // [lng, lat] - Bangalore
export const DEFAULT_MAP_ZOOM = 12;
