// DOM-element builders for route/visit point markers (start, end, check-in/out stop,
// replay scrubber, geocode search pin), for use with maplibregl.Marker. Kept separate
// from MapMarker.tsx (the live salesperson avatar marker) since these represent points
// on a route/visit timeline, not a person.

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

/** Check-in/check-out stop marker along a route history. */
export function visitMarkerElement(): HTMLElement {
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
