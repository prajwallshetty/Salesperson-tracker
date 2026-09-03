import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const AUTH_COOKIE_NAME = "sf_token";

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

/**
 * Reads the JWT from the httpOnly `sf_token` cookie (the primary auth path used by both
 * frontends via `credentials: "include"`). Falls back to an `Authorization: Bearer <token>`
 * header when no cookie is present, so REST tools/scripts and any non-browser client can still
 * authenticate the same way the API worked before the cookie migration.
 *
 * Also rejects deactivated users (User.isActive === false) in real time - this hits the DB on
 * every request (a single indexed primary-key lookup), which is required to make admin
 * deactivation take effect immediately rather than waiting for the JWT to expire.
 */
export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const cookieToken = (req as any).cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  const header = req.headers.authorization;
  const headerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isActive: true } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Account is deactivated" });
  }

  req.auth = payload;
  return next();
});

export function requireRole(...roles: Array<"ADMIN" | "SALESPERSON">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
