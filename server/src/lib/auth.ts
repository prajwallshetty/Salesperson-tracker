import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  // Not throwing here (a hard crash on a missing env var is its own operational problem),
  // but this must never pass silently - a predictable fallback secret in production means
  // anyone can forge a valid admin token.
  console.error("FATAL: JWT_SECRET is not set in production. Set a strong random secret via the JWT_SECRET environment variable.");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface TokenPayload {
  kind: "tenant";
  userId: string;
  role: "ADMIN" | "SALESPERSON";
  salespersonId?: string;
  // Set once at login from the matched User row (never client-supplied) and never changes
  // for a given user afterward - see middleware/auth.ts's requireAuth for why this is still
  // re-verified against the live Tenant row on every request rather than trusted blindly for
  // the tenant's current status.
  tenantId: string;
  // Only set by POST /api/platform/tenants/:id/impersonate (platform-admin-only, see
  // platformOps.routes.ts) - the id of the PlatformAdmin who minted this session. Its mere
  // presence is what the frontend banner and POST /api/auth/impersonation/end key off of;
  // never settable by anything a browser sends, only ever written server-side at mint time.
  impersonatedBy?: string;
}

// Platform-level staff (SalesGrid's own team, not a tenant's ADMIN) authenticate with a
// completely separate token shape/cookie/middleware - see middleware/platformAuth.ts - so a
// tenant token can never be mistaken for (or escalated into) platform access, and vice versa.
export interface PlatformTokenPayload {
  kind: "platform";
  platformAdminId: string;
}

export function signToken(payload: Omit<TokenPayload, "kind">, options?: { expiresIn?: jwt.SignOptions["expiresIn"] }): string {
  return jwt.sign({ ...payload, kind: "tenant" }, JWT_SECRET, { expiresIn: options?.expiresIn ?? "30d" });
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
  if (payload.kind !== "tenant") throw new Error("Not a tenant token");
  return payload;
}

export function signPlatformToken(payload: Omit<PlatformTokenPayload, "kind">): string {
  return jwt.sign({ ...payload, kind: "platform" }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyPlatformToken(token: string): PlatformTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as PlatformTokenPayload;
  if (payload.kind !== "platform") throw new Error("Not a platform token");
  return payload;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
