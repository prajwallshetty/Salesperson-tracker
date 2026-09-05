import rateLimit from "express-rate-limit";

// Applied only to endpoints that are either unauthenticated + credential-guessable (login,
// access-code login) or that trigger real external side effects (Razorpay subscription/customer
// creation, cancellation) - not blanket-applied to every route, since most of the API is already
// gated by requireAuth + tenant scoping and doesn't need a second layer of throttling.
const standardMessage = { error: "Too many requests. Please try again in a few minutes." };

function limiter(windowMinutes: number, max: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: standardMessage,
  });
}

/** Login endpoints (email/password, access code): guards against credential/code guessing. */
export const authRateLimit = limiter(15, 20);

/** Signup: guards against automated tenant-creation spam. */
export const signupRateLimit = limiter(60, 10);

/** Billing checkout/cancel: these call the real Razorpay API, so throttle beyond just auth. */
export const billingRateLimit = limiter(15, 20);
