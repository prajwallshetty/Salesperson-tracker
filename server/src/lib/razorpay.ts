import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * This environment has no live Razorpay account, so RAZORPAY_KEY_ID/KEY_SECRET are unset here -
 * every function below throws a clear, typed error rather than silently no-opping or faking a
 * successful response, so a missing/misconfigured key never looks like "billing succeeded."
 * Set these from the Razorpay dashboard's API Keys section (test mode keys while developing,
 * separate live keys in production - never mix the two, never commit either to git).
 */
export class RazorpayNotConfiguredError extends Error {
  status = 503;
  constructor() {
    super("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    this.name = "RazorpayNotConfiguredError";
  }
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

let client: Razorpay | null = null;

/** Lazily constructed so importing this module never throws - only calling getRazorpay() does. */
export function getRazorpay(): Razorpay {
  if (!isRazorpayConfigured()) throw new RazorpayNotConfiguredError();
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

/**
 * Verifies an HMAC-SHA256 signature the same way for both call sites that need it:
 *  - the async webhook (signs the raw request body with RAZORPAY_WEBHOOK_SECRET)
 *  - the synchronous checkout-success callback (signs `orderId|paymentId` or
 *    `paymentId|subscriptionId` with RAZORPAY_KEY_SECRET)
 * Both are the exact same primitive per Razorpay's docs: hex HMAC-SHA256 of a string, compared
 * to a header/field Razorpay provides. Uses a constant-time comparison to avoid a timing attack
 * on the signature check itself.
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
