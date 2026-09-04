// DOM-element marker builders for mapboxgl.Marker (which accepts any HTMLElement),
// mirroring the old Leaflet divIcon markers so the visual language didn't need to change.

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function elementFromHtml(html: string): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

export function dotMarkerElement(color: string, size = 16, pulse = false): HTMLElement {
  return elementFromHtml(`<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    " class="${pulse ? "marker-pulse" : ""}"></div>`);
}

export function startMarkerElement(): HTMLElement {
  return dotMarkerElement("#22c55e", 16);
}
export function endMarkerElement(): HTMLElement {
  return dotMarkerElement("#ef4444", 16);
}
export function stopMarkerElement(): HTMLElement {
  return dotMarkerElement("#3d63f5", 12);
}
export function replayMarkerElement(): HTMLElement {
  return elementFromHtml(`<div style="
      width:22px;height:22px;border-radius:9999px;background:#f59e0b;
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
    "></div>`);
}
export function pinMarkerElement(color: string): HTMLElement {
  return dotMarkerElement(color, 18);
}

/** Circular avatar/photo marker with an online/offline status dot, for a live salesperson. */
export function avatarMarkerElement(opts: { src: string | null; initials: string; online: boolean; size?: number }): HTMLElement {
  const { src, initials, online, size = 40 } = opts;
  const dotColor = online ? "hsl(var(--success))" : "hsl(var(--muted-foreground))";
  const dotSize = Math.round(size * 0.32);
  const inner = src
    ? `<img src="${escapeHtml(src)}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(
        size * 0.34
      )}px;color:hsl(var(--primary));background:hsl(var(--primary-soft));">${escapeHtml(initials)}</div>`;
  return elementFromHtml(`
    <div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
      <div style="width:100%;height:100%;border-radius:9999px;overflow:hidden;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);background:#fff;">
        ${inner}
      </div>
      <span style="position:absolute;right:-1px;bottom:-1px;width:${dotSize}px;height:${dotSize}px;border-radius:9999px;background:${dotColor};border:2px solid #fff;"></span>
    </div>`);
}
