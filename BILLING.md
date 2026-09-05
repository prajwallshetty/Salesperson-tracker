# Billing & Multi-Tenant Subscriptions

How Sales Grid's Razorpay billing, plans, and Super Admin platform work. Read this before
touching anything under `server/src/routes/billing.routes.ts`, `razorpayWebhook.routes.ts`,
`services/razorpay*.ts`, `lib/entitlements.ts`, or `admin-web/app/super-admin/`.

## Tenant architecture

Every customer company is a `Tenant` row. Every tenant-owned table (`User`, `Salesperson`,
`Customer`, `Order`, ...) carries a `tenantId`, and every authenticated request resolves its
tenant from the signed session cookie set at login/signup - **never** from a client-supplied
header, query param, or body field. See `API_CONTRACT.md`'s "Multi-tenancy" section for the full
enforcement contract.

A `Tenant` has exactly one `Subscription`, which points at a `SubscriptionPlan` (the shared,
global plan catalog - STARTER/GROWTH/PROFESSIONAL/BUSINESS/SCALE/ENTERPRISE, all in INR). The plan
row is the *only* source of truth for pricing/limits/features - the landing page, signup, and
every entitlement check all read the same `SubscriptionPlan.monthlyPrice` /
`.maxSalespersons` / `.features`. Nothing hard-codes a price or limit anywhere else.

## Subscription states

Internal states, defined in `SubscriptionStatus` (`schema.prisma`):

| State      | Meaning                                                              |
|------------|-----------------------------------------------------------------------|
| TRIALING   | On the plan's trial (`trialStart`/`trialEnd`, default 14 days, configurable per-plan) |
| ACTIVE     | Paying, in good standing                                              |
| PAST_DUE   | A charge failed; Razorpay is retrying. Still gets paid features (grace period). |
| CANCELLED  | Tenant or admin cancelled                                             |
| EXPIRED    | Trial ran out with no payment, or a subscription completed its term  |
| SUSPENDED  | Razorpay gave up retrying (`halted`) - needs manual attention        |

Razorpay's own raw statuses (`created`, `authenticated`, `active`, `pending`, `halted`,
`cancelled`, `completed`, `expired`) are mapped into the table above in exactly one place,
`server/src/lib/subscriptionStatusMap.ts`. Nothing else in the codebase should read or branch on
a raw Razorpay status string - if you need a new mapping, add it there.

None of these states ever cause data deletion. An EXPIRED/CANCELLED/SUSPENDED tenant keeps every
row it ever had; only paid *functionality* (gated by `requireActiveSubscription()`/
`requireFeature()`) is restricted, and the tenant admin can always reach
`GET/POST /api/billing/*` to see their status and pick a plan.

## Payment lifecycle

```
signup -> tenant created (STARTER trial, no Razorpay involved yet)
        -> tenant admin opens Settings -> Billing -> Upgrade / Change plan
        -> POST /api/billing/checkout {planKey, interval}
             - new tenant: creates a Razorpay customer + subscription, returns
               {razorpaySubscriptionId, razorpayKeyId} for the browser to open
               Razorpay Checkout with
             - tenant with an existing LIVE Razorpay subscription: calls
               subscriptions.update() on it directly (upgrade/downgrade) - no
               new checkout popup, no duplicate Razorpay subscription
        -> customer completes payment in Razorpay's own hosted checkout
        -> Razorpay calls POST /api/billing/razorpay/webhook
        -> signature verified, event_id checked for idempotency, subscription
           status updated INSIDE A TRANSACTION, BillingAuditLog written
        -> only NOW does Subscription.status flip to ACTIVE
```

**The frontend's payment-success callback is never trusted.** `admin-web`'s Razorpay Checkout
`handler` callback only triggers a re-fetch of `/api/billing/subscription` - the actual status
change happens exclusively inside the webhook handler, after signature verification. This is the
single most important rule in this whole system: read `server/src/services/razorpayWebhook.ts`
before changing anything payment-related.

## Webhook idempotency

`billing_events.event_id` (Razorpay's `x-razorpay-event-id` header if present, else a
deterministic `eventType:entityId:createdAt` key) is a unique DB constraint. A retried delivery
(Razorpay resending after a timeout, or a manual replay) is detected and skipped *before* any
subscription/audit-log write happens - see `processRazorpayWebhook()`. Verified locally by
replaying an identical signed payload and confirming `alreadyProcessed: true` with no duplicate
rows.

## Razorpay setup (test and production)

1. Get API keys from the Razorpay Dashboard → Settings → API Keys. Use **Test Mode** keys while
   developing, separate **Live Mode** keys in production. Never mix the two, never commit either.
2. Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `server/.env` (see `.env.example`).
3. Create the Razorpay Plan objects for every tier once, via the controlled setup script (never
   dynamically at checkout time - Razorpay has no upsert-by-name API, so re-running this after
   plan ids are already set is a safe no-op):
   ```
   cd server && npx tsx scripts/setup-razorpay-plans.ts
   ```
   This writes the resulting `razorpayMonthlyPlanId`/`razorpayYearlyPlanId` back onto each
   `SubscriptionPlan` row. A plan with no Razorpay id configured yet returns a clear `409` from
   `/api/billing/checkout` rather than silently failing or faking success.
4. Configure the webhook in the Razorpay Dashboard → Settings → Webhooks:
   - URL: `https://api.salesgrid.live/api/billing/razorpay/webhook` (or your deployed API host)
   - Secret: generate one, set it as `RAZORPAY_WEBHOOK_SECRET` in `server/.env`
   - Events: at minimum `subscription.activated`, `subscription.charged`, `subscription.pending`,
     `subscription.halted`, `subscription.cancelled`, `subscription.completed`,
     `payment.captured`, `payment.failed`
5. Local testing without a live Razorpay account: forge a signed webhook payload with Python
   (`hmac.new(secret, body, sha256).hexdigest()`) and POST it to
   `http://localhost:4000/api/billing/razorpay/webhook` with an `x-razorpay-signature` header -
   this is exactly how the webhook path was verified during development, no real Razorpay account
   needed for that part.

## Plan management

Platform admins manage the plan catalog at **Super Admin → Plans**
(`admin-web/app/super-admin/(protected)/plans`), backed by `POST/PATCH /api/platform/plans`.
There is no delete endpoint - a plan is deactivated (`isActive: false`), never removed, so it
can't be pulled out from under a tenant currently subscribed to it.

## Super Admin access

Platform staff are `PlatformAdmin` rows - not a `User`/`Tenant` at all, a completely separate
table with its own login, JWT, and cookie (`sg_platform_token`, see
`middleware/platformAuth.ts`). Bootstrap the first one from the server:
```
npx tsx scripts/bootstrap-platform-admin.ts <email> [name]
```
Sign in at `/super-admin/login` in admin-web. A tenant admin's session cookie can never satisfy
`requirePlatformAuth`, and a platform admin's session can never satisfy a tenant route's
`requireAuth` - verified by visiting `/super-admin/dashboard` on a tenant-admin browser session
(bounces to `/super-admin/login`) and by every `/api/platform/*` route rejecting an unauthenticated
or tenant-authenticated request with 401.

## Troubleshooting

- **"Payments are temporarily unavailable"** (503) - `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`
  aren't set in this environment. Expected in local dev without a Razorpay account.
- **"<Plan> does not have a Razorpay monthly plan configured yet"** (409) - run
  `scripts/setup-razorpay-plans.ts` against a real Razorpay account first.
- **Webhook signature always invalid** - almost always a stale server process that started
  before `RAZORPAY_WEBHOOK_SECRET` was set in `.env` (`tsx watch` doesn't reload on `.env`
  changes, only on `src/**` changes) - fully restart the process.
- **A tenant's plan changed in Postgres but Razorpay still shows the old plan** - never happens
  through the app's own upgrade/downgrade path (`changeSubscriptionPlan()` always calls
  Razorpay's `subscriptions.update()` first); it can only happen via the platform admin's manual
  override (`PATCH /platform/tenants/:id/subscription`), which is explicitly a support escape
  hatch that does not touch Razorpay - see that route's own comment.
