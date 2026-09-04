// DOM-element builder for a live salesperson marker, for use with maplibregl.Marker
// (which accepts any HTMLElement as its `element` option). Kept as a plain DOM builder
// rather than a declarative React component: markers are mutated imperatively (position,
// online-dot color) by useAnimatedMarkers so that a single salesperson moving never
// triggers a React re-render of the map or its siblings.

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function elementFromHtml(html: string): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

export interface MapMarkerOptions {
  src: string | null;
  initials: string;
  online: boolean;
  size?: number;
}

/** Circular avatar/photo marker with an online/offline status dot, for a live salesperson. */
export function mapMarkerElement(opts: MapMarkerOptions): HTMLElement {
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
