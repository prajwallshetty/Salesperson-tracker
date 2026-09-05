import { Request, Response, NextFunction } from "express";
import { verifyPlatformToken, PlatformTokenPayload } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const PLATFORM_AUTH_COOKIE_NAME = "sg_platform_token";

declare global {
  namespace Express {
    interface Request {
      platformAuth?: PlatformTokenPayload;
    }
  }
}

// Mirrors middleware/auth.ts's requireAuth (own cookie, own token kind, live isActive
// recheck) but is otherwise completely separate - a tenant sf_token can never satisfy this,
// and this can never satisfy requireAuth, so platform access and tenant access can't cross.
export const requirePlatformAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = (req as any).cookies?.[PLATFORM_AUTH_COOKIE_NAME] as string | undefined;
  if (!token) return res.status(401).json({ error: "Missing authentication token" });

  let payload: PlatformTokenPayload;
  try {
    payload = verifyPlatformToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { id: payload.platformAdminId }, select: { isActive: true } });
  if (!admin || !admin.isActive) return res.status(401).json({ error: "Account is deactivated" });

  req.platformAuth = payload;
  next();
});
