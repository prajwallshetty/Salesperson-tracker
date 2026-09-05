/**
 * Narrows a raw query-string value down to one of an enum's allowed values.
 *
 * Assigning a request's query string straight into a Prisma enum filter
 * (`if (status) where.status = status`) hands Prisma a value it may not accept, and it throws
 * a PrismaClientValidationError - which surfaced as an HTTP 500 for what is really just a bad
 * request. Passing the allowed values through from `@prisma/client`'s own generated enum
 * objects means this list can never drift from the schema.
 *
 * Returns undefined for an absent filter (so "no filter" stays the default), and throws a
 * 400-tagged error naming the valid options for anything unrecognized.
 */
export function parseEnumQuery<T extends string>(
  value: string | undefined,
  allowed: Record<string, T>,
  field: string
): T | undefined {
  if (value === undefined || value === "") return undefined;
  const values = Object.values(allowed);
  if (values.includes(value as T)) return value as T;
  throw Object.assign(new Error(`Invalid ${field}. Expected one of: ${values.join(", ")}`), { status: 400 });
}
