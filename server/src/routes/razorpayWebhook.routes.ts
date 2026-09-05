import { Router } from "express";
import express from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyRazorpayWebhookSignature, processRazorpayWebhook, InvalidWebhookSignatureError } from "../services/razorpayWebhook";

/**
 * Deliberately its own router, mounted in index.ts BEFORE app.use(express.json()) (see the
 * comment there). Signature verification needs the exact raw bytes Razorpay signed; if the
 * global JSON parser ran first, it would already have consumed the request stream and
 * re-serialized it into a parsed object, and re-stringifying that could produce different bytes
 * than what Razorpay actually sent (key order, number formatting), making genuine webhooks fail
 * verification unpredictably. `express.raw()` here, scoped to just this router, preserves the
 * original bytes for the one route that needs them.
 */
const router = Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json", limit: "2mb" }),
  asyncHandler(async (req, res) => {
    const rawBody = req.body as Buffer;
    const signature = req.headers["x-razorpay-signature"] as string | undefined;

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      throw new InvalidWebhookSignatureError();
    }

    const headerEventId = req.headers["x-razorpay-event-id"] as string | undefined;
    const result = await processRazorpayWebhook(rawBody, headerEventId);

    // Always 200 once signature-verified and durably recorded, per Razorpay's retry contract -
    // returning non-2xx here (even for "nothing to apply") would make Razorpay keep retrying a
    // webhook we've already handled.
    res.json({ ok: true, alreadyProcessed: result.alreadyProcessed });
  })
);

export default router;
