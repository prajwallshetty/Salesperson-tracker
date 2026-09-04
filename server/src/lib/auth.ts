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
  userId: string;
  role: "ADMIN" | "SALESPERSON";
  salespersonId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
