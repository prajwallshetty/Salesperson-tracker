import { Request, Response, NextFunction } from "express";

/**
 * `accessCode` is a login credential (the salesperson-app equivalent of a password), but
 * this Prisma version has no `omit` API (neither per-query nor global), and the field
 * appears deeply nested wherever a record is attributed to its salesperson - e.g. every
 * Order/Visit/Quotation/Collection/Lead response that does
 * `include: { salesperson: { include: { user: ... } } }` (a pattern used across most of
 * this codebase) would otherwise carry `salesperson.accessCode` straight into the JSON
 * response. Auditing and fixing every such call site individually isn't reliable - a
 * single missed spot is a real credential leak - so this strips the key globally instead,
 * as a response-layer safety net that covers every current and future occurrence.
 *
 * The three admin endpoints that legitimately need the real value
 * (POST /salespersons, GET/POST/PATCH .../access-code) explicitly opt out via
 * `res.locals.allowAccessCode = true` set before calling res.json.
 */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  // Date (every createdAt/updatedAt/checkInAt/etc. field in every response) has no enumerable
  // own properties, so walking it with Object.entries below would silently flatten it to `{}`
  // instead of leaving it alone - this bit every single response before being caught. Anything
  // else that isn't a plain object (rare here, but e.g. a Buffer) gets the same pass-through.
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && value.constructor !== Object) return value;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === "accessCode") continue;
      out[key] = redact(val);
    }
    return out;
  }
  return value;
}

export function redactAccessCode(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.locals.allowAccessCode) return originalJson(body);
    return originalJson(redact(body));
  };
  next();
}
