import L from "leaflet";

// We avoid Leaflet's default marker image assets (which break under bundlers without
// extra asset config) by rendering colored divIcon markers instead.

function dotIcon(color: string, size = 16, pulse = false) {
  return L.divIcon({
    className: "",
    html: `<div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};border:2px solid white;
        box-shadow:0 1px 4px rgba(0,0,0,.35);
      " class="${pulse ? "marker-pulse" : ""}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const onlineIcon = dotIcon("#22c55e", 18, true);
export const offlineIcon = dotIcon("#94a3b8", 16);
export const startIcon = dotIcon("#22c55e", 16);
export const endIcon = dotIcon("#ef4444", 16);
export const stopIcon = dotIcon("#3d63f5", 12);
export const replayIcon = L.divIcon({
  className: "",
  html: `<div style="
      width:22px;height:22px;border-radius:9999px;background:#f59e0b;
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
    "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function pinIcon(color: string) {
  return dotIcon(color, 18);
}
