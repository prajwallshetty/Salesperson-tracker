import type { StyleSpecification } from "maplibre-gl";

/**
 * Single centralized basemap definition - every map in the app (live tracking, its
 * dashboard preview, route history) reads this constant instead of hardcoding a tile
 * provider, so the basemap can be swapped later (a different raster provider, a vector
 * CARTO/MapTiler/Mapbox style with a key, a self-hosted tile server) by editing this one
 * file, not by touching every map component.
 *
 * Uses raw OpenStreetMap raster tiles: no API key, no account, no rate-limited "fair use"
 * tier that can start watermarking tiles without notice (which is what happened with
 * CARTO's basemap tiles - as of an August 2026 policy change they now require a free API
 * key, and unauthenticated requests render a visible "API key required" watermark, which
 * isn't acceptable for a production product). If a nicer vector basemap is wanted later,
 * getting a free CARTO or MapTiler key and pointing BASEMAP_STYLE at their style.json URL
 * is a one-line change here.
 *
 * OSM's tile usage policy (https://operations.osmfoundation.org/policies/tiles/) asks for
 * a reasonable request volume and attribution - both satisfied by MapLibre's built-in
 * attribution control (enabled by every SalesGridMap instance) and normal browser-driven
 * tile loading (no bulk/offline scraping).
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
export const DEFAULT_MAP_ZOOM = 11;
