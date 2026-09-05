// Loads Razorpay's official Checkout.js on demand (never bundled/self-hosted - Razorpay serves
// and updates this script themselves) and wraps it in a typed helper. This is the ONLY Razorpay
// code allowed to run in the browser: it only ever sees RAZORPAY_KEY_ID (the public key, safe to
// expose - see server/.env.example) and a subscription id the backend already created. It never
// has access to RAZORPAY_KEY_SECRET/RAZORPAY_WEBHOOK_SECRET, which never leave the server.
const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open(): void; on(event: string, cb: (arg: unknown) => void): void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

let loadPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
  return loadPromise;
}

/**
 * Opens Razorpay's hosted checkout for a subscription the backend already created via
 * POST /billing/checkout. The `onSuccess`/`onDismiss` callbacks here are for UI purposes ONLY
 * (closing the modal, showing a "confirming your payment" message) - they are NEVER treated as
 * proof that the subscription is paid/active. Only the backend's Razorpay webhook does that (see
 * server/src/services/razorpayWebhook.ts); the caller must re-fetch /billing/subscription from
 * the server to learn the real status, not trust anything from this callback.
 */
export async function openRazorpayCheckout(opts: {
  keyId: string;
  subscriptionId: string;
  customerName: string;
  customerEmail: string;
  planLabel: string;
  onSuccess: () => void;
  onDismiss: () => void;
}): Promise<void> {
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable");

  const rzp = new window.Razorpay({
    key: opts.keyId,
    subscription_id: opts.subscriptionId,
    name: "Sales Grid",
    description: opts.planLabel,
    prefill: { name: opts.customerName, email: opts.customerEmail },
    theme: { color: "#4f46e5" },
    handler: () => opts.onSuccess(),
    modal: { ondismiss: () => opts.onDismiss() },
  });
  rzp.on("payment.failed", () => opts.onDismiss());
  rzp.open();
}
