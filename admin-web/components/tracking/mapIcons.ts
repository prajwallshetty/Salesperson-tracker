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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// Custom avatar marker for the live tracking map: a circular photo (or initials fallback)
// badge matching the design system's Avatar component, plus a small online/offline status
// dot — replaces the plain colored dots used elsewhere (start/end/stop/replay markers keep
// those, since they're not "a person").
export function avatarMarkerIcon(opts: { src: string | null; initials: string; online: boolean; size?: number }) {
  const { src, initials, online, size = 40 } = opts;
  const dotColor = online ? "hsl(var(--success))" : "hsl(var(--muted-foreground))";
  const dotSize = Math.round(size * 0.32);
  const inner = src
    ? `<img src="${escapeHtml(src)}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(
        size * 0.34
      )}px;color:hsl(var(--primary));background:hsl(var(--primary-soft));">${escapeHtml(initials)}</div>`;
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <div style="width:100%;height:100%;border-radius:9999px;overflow:hidden;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);background:#fff;">
        ${inner}
      </div>
      <span style="position:absolute;right:-1px;bottom:-1px;width:${dotSize}px;height:${dotSize}px;border-radius:9999px;background:${dotColor};border:2px solid #fff;"></span>
    </div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  });
}
