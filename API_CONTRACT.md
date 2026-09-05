# Backend API Contract

Base URL (dev): `http://localhost:4000`
All endpoints are prefixed with `/api`.
Uploaded files served statically at `http://localhost:4000/uploads/<filename>`.

Roles: `ADMIN`, `SALESPERSON`. Most endpoints scope data automatically to the logged-in
salesperson when called with a SALESPERSON token (no need to pass salespersonId).

## Multi-tenancy

The platform is multi-tenant: every company/organization is a `Tenant`, and every tenant-owned
row (users, salespersons, customers, products, visits, orders, etc.) carries a `tenantId`. Every
authenticated request is scoped to `req.auth.tenantId`, which comes from the signed session
token set at login/signup - **never** from a client-supplied header, query param, or body field.
A tenant can never read or modify another tenant's data; cross-tenant access attempts return 404
(existence hidden) or 403 (existence visible, e.g. "not your visit"), never another tenant's
data. A suspended tenant (`Tenant.status = SUSPENDED`, set by a platform admin) is locked out of
every endpoint immediately, including already-issued sessions - existing data is never deleted.

- `POST /api/auth/signup` `{ companyName, name, email, password }` → creates a new Tenant, its
  first ADMIN user, and a 14-day STARTER-plan trial subscription, then signs the owner in (same
  cookie as `/auth/login`). Returns `{ user, tenant }`.

Subscriptions gate a plan's `maxSalespersons`/`maxAdmins`/feature limits (see
`SubscriptionPlan.features`); creating a salesperson beyond the plan's limit returns `402` with
`{ error: "You've reached your plan limit. ..." }` - enforced server-side in
`services/accounts.ts`, not just hidden in the UI.

## Platform (Super Admin)

SalesGrid's own platform staff - not a tenant user, not reachable via `/api/auth/*` - manage
tenants/plans/subscriptions across the whole system. Completely separate auth: its own httpOnly
cookie (`sg_platform_token`), its own JWT shape, its own middleware
(`middleware/platformAuth.ts`). A tenant session cannot call these, and a platform session cannot
call any tenant-scoped endpoint.

- `POST /api/platform/login` `{ email, password }` → `{ admin }`, sets `sg_platform_token`
- `POST /api/platform/logout` → 204
- `GET /api/platform/me` (platform auth)
- `PATCH /api/platform/me/password` `{ currentPassword, newPassword }` (platform auth)
- `GET /api/platform/tenants?search=&status=&page=&pageSize=` (platform auth) → each tenant with
  its user/salesperson counts and current subscription
- `GET /api/platform/tenants/:id` (platform auth)
- `PATCH /api/platform/tenants/:id/status` `{ status: "ACTIVE"|"SUSPENDED" }` (platform auth)
- `GET /api/platform/plans` (platform auth) → the plan catalog
- `PATCH /api/platform/tenants/:id/subscription` `{ planKey?, status?, currentPeriodEnd? }`
  (platform auth) - manual support override (comping an account, fixing a stuck subscription).
  Does not touch Razorpay itself; every real checkout/renewal/cancellation instead flows through
  the webhook in `services/razorpayWebhook.ts`, which updates the same `Subscription` row. Using
  this on a tenant with a live `providerSubscriptionId` can desync local state from Razorpay's.
- `GET /api/platform/tenants/:id` (platform auth) also returns `razorpayCustomerId` and
  `lastPaymentEvent` (the most recent `WEBHOOK_PAYMENT_*` audit action, if any) alongside the
  tenant's subscription/plan - never a Razorpay secret, only identifiers already safe to show a
  support admin.
- `GET /api/platform/tenants/:id/billing-audit-log?page=&pageSize=` (platform auth) → paginated
  `BillingAuditLog` rows for that tenant (plan/status changes, webhook-driven transitions, who/what
  triggered each one) - the audit trail for "why did this tenant's billing state change".

There is no bootstrap endpoint for the first PlatformAdmin - run
`npx tsx scripts/bootstrap-platform-admin.ts <email> [name]` once from the server, which prints a
generated password to the console (shown once, not stored in plaintext anywhere).

## Billing (Razorpay)

A tenant's subscription is billed through Razorpay's official Subscriptions API - never a
frontend payment simulation. `RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` never leave the
server; only `RAZORPAY_KEY_ID` (public) reaches the browser, returned from `POST
/api/billing/checkout` for use with Razorpay's own Checkout.js.

- `GET /api/billing/subscription` (tenant auth, any role) → status, billing interval, trial/renewal
  dates, cancellation state, plan (with limits/features), and current salesperson usage. The one
  place both admin-web and any future client should read a tenant's billing state from.
- `POST /api/billing/checkout` `{ planKey, interval: "MONTHLY"|"YEARLY" }` (tenant auth, ADMIN) →
  `{ razorpaySubscriptionId, razorpayKeyId }` to open Razorpay Checkout with. Does **not** mark the
  subscription active/paid - that only happens once the webhook below verifies payment. `409` if
  the plan has no Razorpay plan id configured yet (see `scripts/setup-razorpay-plans.ts`), `503` if
  Razorpay isn't configured in this environment.
- `POST /api/billing/cancel` `{ immediately?: boolean }` (tenant auth, ADMIN) - cancels at Razorpay
  (end of period by default), marks `cancelAtPeriodEnd`/`cancelledAt` locally; the subsequent
  `subscription.cancelled` webhook is what actually flips `status` to `CANCELLED`.
- `POST /api/billing/razorpay/webhook` (Razorpay only, HMAC-signed via `x-razorpay-signature`,
  mounted before the global JSON body parser so the raw bytes Razorpay signed are verified as-is) -
  idempotent on `billing_events.event_id`; maps Razorpay's raw status into the app's own
  `TRIALING`/`ACTIVE`/`PAST_DUE`/`CANCELLED`/`EXPIRED`/`SUSPENDED` via
  `lib/subscriptionStatusMap.ts` and writes a `BillingAuditLog` row for every applied change.

Plan/feature limits are enforced server-side via `lib/entitlements.ts`'s
`requireActiveSubscription()`/`requireFeature()`/`requirePlanLimit()` middleware on the routes that
represent paid functionality - never only by hiding a button in the frontend. A tenant whose
subscription isn't in a usable state gets a specific `402`/`403` message (e.g. "Your trial has
expired. Choose a plan to continue."), never a generic error, and always keeps access to
`/api/billing/*` itself and its own data.

## Auth transport — httpOnly cookie (read this before wiring up either frontend)

Auth is cookie-based, not a bearer token in the response body. This is the exact contract the
frontend must implement:

- The server sets an httpOnly cookie named **`sf_token`** on successful login
  (`httpOnly: true`, `secure` in production only, `sameSite: "lax"`, 30-day expiry, `path: "/"`).
  JavaScript cannot read this cookie - that's the point - so **do not** expect a `token` field in
  the login response body anymore.
- **Every** API request from the frontend must be made with credentials included so the browser
  sends the cookie: `fetch(url, { credentials: "include" })` or, with axios,
  `axios.create({ baseURL, withCredentials: true })`. Without this, every authenticated request
  will 401 even immediately after a successful login.
- CORS already has `credentials: true` configured server-side for both the Express app and the
  Socket.IO server, and `CLIENT_ORIGIN` in `server/.env` must list the exact frontend origin(s)
  (already set to `http://localhost:5173,http://localhost:5174` for admin-web/sales-app in dev) -
  credentialed CORS cannot use a wildcard origin.
- `sameSite: "lax"` is correct for local dev because admin-web (`:5173`), sales-app (`:5174`), and
  the API (`:4000`) are all `localhost` - browsers treat different ports on `localhost` as the
  same site for SameSite purposes, so the cookie round-trips fine. **If the real deployment puts
  the two frontends and the API on genuinely different registrable domains** (not just different
  ports/subdomains of one domain), this will need `sameSite: "none"` + `secure: true` instead,
  which also requires HTTPS on all three origins (browsers reject `SameSite=None` over plain
  HTTP). This isn't done yet because it would break local dev - whoever deploys should revisit
  `server/src/routes/auth.routes.ts`'s `cookieOptions()`.
- An `Authorization: Bearer <token>` header still works as a fallback (useful for non-browser
  clients/scripts), but the cookie is the primary, expected path for both frontends.
- A deactivated user (`User.isActive === false`, settable via `PATCH /api/users/:id`) is rejected
  in real time on every request - not just at next login - so a currently-logged-in session dies
  immediately when an admin deactivates the account.

## Real-time (Socket.IO)

Connect with cookies, matching the REST auth path:
`io("http://localhost:4000", { withCredentials: true })`

Sockets don't go through Express middleware, so the server parses the `sf_token` cookie directly
off the raw `Cookie` header on the handshake - as long as the client sets `withCredentials: true`
(the same flag that makes a browser attach cookies to a cross-origin XHR/fetch), no other
client-side auth wiring is needed; there's no more `auth: { token }` handshake option to pass. (A
legacy `auth: { token: "<JWT>" }` handshake option is still accepted first if present, for
backward compatibility, but new code should just use `withCredentials: true`.)

- Admin sockets auto-join room `admins` and receive:
  - `location:update` → `{ salespersonId, name, lat, lng, speed, heading, recordedAt, todayDistanceKm, isOnline }`
  - `salesperson:status` → `{ salespersonId, isOnline, fieldWorkStatus }`
  - `notification:new` → `{ type, title, message, metadata, createdAt }`
- Salesperson sockets should emit `location:update` periodically while field work is active:
  `socket.emit("location:update", { lat, lng, speed?, accuracy?, heading?, recordedAt? })`
- Every socket auto-joins `user:<userId>` and receives `notification:new` targeted at them.
- A deactivated user's socket handshake is rejected the same way a deactivated user's REST
  request is.

## Auth

- `POST /api/auth/login` `{ email, password }` → `{ user: { id, name, email, role, avatarUrl, salespersonId, salespersonStatus } }`.
  Sets the `sf_token` httpOnly cookie (see above) - there is no `token` in the body anymore.
  Returns 401 for a deactivated account, same as wrong credentials.
- `POST /api/auth/access-code-login` `{ accessCode }` → same `{ user }` shape and cookie as
  `/auth/login`. This is the sales-app's sign-in method (salespeople don't use email/password);
  admin accounts are unaffected. Returns 401 `Invalid access code` for an unknown code, a
  disabled code, or an inactive/deactivated salesperson - deliberately the same generic error
  for all three so a caller can't enumerate which codes exist.
- `POST /api/auth/logout` (auth) → 204, clears the `sf_token` cookie.
- `GET /api/auth/me` (auth) → current user object (same shape as the login body's `user`)

## Salespersons (admin unless noted)

- `GET /api/salespersons?status=&territoryId=&managerId=&search=&page=&pageSize=` → `{ items, total, page, pageSize }`
- `POST /api/salespersons` `{ name, email, password, phone?, employeeCode, territoryId?, managerId? }` → created salesperson (includes `user`, `territory`). The response includes the
  auto-generated `accessCode` (needed once, immediately, to hand to the new salesperson) - every
  other endpoint that returns a Salesperson strips `accessCode` from the response.
- `GET /api/salespersons/:id/access-code` (admin) → `{ accessCode, accessCodeEnabled, accessCodeLastUsedAt }`
- `POST /api/salespersons/:id/access-code/regenerate` (admin) → issues a new code (old one stops
  working immediately), re-enables it, and clears `accessCodeLastUsedAt`. Same response shape.
- `PATCH /api/salespersons/:id/access-code` `{ enabled: boolean }` (admin) → enable/disable the
  existing code without changing its value. Same response shape.
- `GET /api/salespersons/:id` (admin or self) → profile with `_count.{customers,visits,orders}`
- `PATCH /api/salespersons/:id` `{ name?, phone?, employeeCode?, territoryId?, managerId? }`
- `PATCH /api/salespersons/:id/status` `{ status: "ACTIVE"|"INACTIVE" }`
- `POST /api/salespersons/:id/assign-customers` `{ customerIds: string[] }`
- `POST /api/salespersons/:id/targets` `{ period: "DAILY"|"WEEKLY"|"MONTHLY", periodStart, periodEnd, targetAmount }`
- `GET /api/salespersons/:id/targets` (admin or self)
- `GET /api/salespersons/:id/attendance` (admin or self) → last 60 records
- `GET /api/salespersons/:id/visits` (admin or self)
- `GET /api/salespersons/:id/orders` (admin or self)
- `GET /api/salespersons/:id/collections` (admin or self)
- `GET /api/salespersons/:id/customers` (admin or self)
- `GET /api/salespersons/:id/performance-summary` (admin or self) → `{ todaySales, todayOrders, monthlySales, monthlyOrders, todayVisits, pendingFollowUps, monthlyCollections }`

## Territories

- `GET /api/territories` (auth) → list with `_count.{salespersons,customers}`
- `POST /api/territories` (admin) `{ name, description? }`
- `PATCH /api/territories/:id` (admin)
- `DELETE /api/territories/:id` (admin)
- `GET /api/territories/:id/performance` (admin) → aggregated month-to-date performance for every
  salesperson in the territory:
  ```
  {
    territoryId, territoryName, salespersonCount, customerCount,
    period: { gte, lte },  // current calendar month
    totals: { sales, orders, visits, collections, targetAmount, achievementPercent },
    salespersons: [{ salespersonId, name, avatarUrl, sales, orders, visits, collections,
                      targetAmount, achievementPercent }]
  }
  ```

To assign/move a salesperson or customer to a territory, use the existing
`PATCH /api/salespersons/:id` / `PATCH /api/customers/:id` with `{ territoryId }` - both already
supported this before this pass, nothing new to call.

## Products

- `GET /api/products?search=&category=&isActive=&page=&pageSize=` (auth) → `{ items, total, page, pageSize }`
- `GET /api/products/categories` (auth) → `string[]` (distinct `Product.category` values in use -
  unrelated to the new `Category` lookup table below; kept as-is for backward compatibility)
- `POST /api/products` (admin) `{ name, sku, category, unit, price, taxPercent, discountPercent, description? }`
- `PATCH /api/products/:id` (admin) partial update
- `PATCH /api/products/:id/status` (admin) `{ isActive }`
- `POST /api/products/:id/image` (admin) multipart form field `image` → updates `imageUrl`
- `DELETE /api/products/:id` (admin)

## Categories

A standalone lookup table admins manage, independent of `Product.category` (which stays a plain
string on Product for backward compatibility with existing product create/edit flows and the
`category=` filter above). A `Category` row is matched to products **by name**, not a foreign
key - renaming a Category does not retroactively relabel existing products.

- `GET /api/categories?search=&isActive=` (auth) → `Category[]`, each with a live `productCount`
  (count of products whose `category` string equals this category's `name`)
- `GET /api/categories/:id/products` (auth) → products whose `category` matches this category's name
- `POST /api/categories` (admin) `{ name, description? }`
- `PATCH /api/categories/:id` (admin) `{ name?, description? }`
- `PATCH /api/categories/:id/status` (admin) `{ isActive }`
- `DELETE /api/categories/:id` (admin) → 409 if any product still references this category's name

## Pricing (price lists / overrides)

New `PriceList` model: per-product price/discount/tax overrides, optionally scoped to a
territory and/or a specific customer, with an effective date window.

- `GET /api/pricing?productId=&territoryId=&customerId=&isActive=&page=&pageSize=` (auth) →
  `{ items, total, page, pageSize }`, each item includes `product`, `territory`, `customer`
- `GET /api/pricing/:id` (auth)
- `POST /api/pricing` (admin) `{ productId, territoryId?, customerId?, price, discountPercent?, taxPercent?, effectiveFrom, effectiveTo? }`
- `PATCH /api/pricing/:id` (admin) partial update
- `PATCH /api/pricing/:id/deactivate` (admin) → sets `isActive: false`

**Resolution order used when quotations/orders price a line item** (most specific wins):
customer-specific override > territory-specific override (territory is derived from the
customer's `territoryId`) > a generic override (a `PriceList` row with neither `customerId` nor
`territoryId` set) > `Product.price` / `discountPercent` / `taxPercent`. Only active
(`isActive: true`) rows whose `effectiveFrom <= now <= effectiveTo` (or no `effectiveTo`) are
considered. **A product with no matching `PriceList` row prices exactly as it did before this
pass** - this was verified with a before/after diff, so existing quotations/orders are
unaffected unless you explicitly add a price-list row for that product.

## Customers

- `GET /api/customers?search=&territoryId=&salespersonId=&page=&pageSize=` (auth; salesperson sees only their own)
- `GET /api/customers/nearby?lat=&lng=&radiusKm=` (auth) → customers within radius sorted by distance, includes `distanceKm`
- `GET /api/customers/:id` (auth) → includes territory, salesperson, recent visits/orders/collections
- `POST /api/customers` (auth) `{ name, phone?, email?, address?, lat?, lng?, territoryId?, salespersonId?, notes? }`
- `PATCH /api/customers/:id` (auth)
- `DELETE /api/customers/:id` (admin)

## Visits

- `GET /api/visits?status=&outcome=&salespersonId=&customerId=&territoryId=&from=&to=&dateFrom=&dateTo=&page=&pageSize=` (auth)
  - `dateFrom`/`dateTo` are aliases for `from`/`to` (either name works, same meaning: filters `createdAt`)
  - `outcome` filters by the visit's outcome enum (see checkout below)
  - `territoryId` matches a visit whose **customer's** territory or whose **salesperson's**
    territory equals the given id (a visit doesn't carry its own territoryId)
  - **Pagination is opt-in.** Pass `page` and/or `pageSize` to get `{ items, total, page, pageSize }`;
    omit both to get the original bare `Visit[]` array (capped at 200) - this keeps any existing
    caller that doesn't pass them working unchanged.
- `POST /api/visits` `{ customerId, plannedAt? }` (salespersonId inferred for SALESPERSON role)
- `POST /api/visits/:id/checkin` `{ lat, lng }`
- `POST /api/visits/:id/checkout` `{ lat, lng, notes?, outcome?, followUpDate?, photoUrls? }`
  outcome enum: `ORDER_PLACED|FOLLOW_UP_REQUIRED|NOT_INTERESTED|NO_RESPONSE|PAYMENT_COLLECTED|OTHER`
- `POST /api/visits/:id/photos` multipart field `photos` (up to 5) → appends to `photoUrls`
- `PATCH /api/visits/:id` `{ notes?, status?, followUpDate? }`

## Leads

- `GET /api/leads?status=&salespersonId=&search=` (auth)
- `POST /api/leads` `{ name, phone?, email?, company?, source?, notes? }`
- `PATCH /api/leads/:id` partial + `status` enum `NEW|CONTACTED|QUALIFIED|NEGOTIATION|CONVERTED|LOST`
- `POST /api/leads/:id/convert` `{ address?, lat?, lng?, territoryId? }` → creates & returns a Customer

## Follow-ups

- `GET /api/followups?status=PENDING|COMPLETED|OVERDUE|CANCELLED&salespersonId=` (auth)
  (`OVERDUE` server-side = status PENDING and dueDate < now)
- `POST /api/followups` `{ leadId?, customerId?, dueDate, notes? }`
- `PATCH /api/followups/:id/complete`
- `PATCH /api/followups/:id` partial update

Line pricing for both Quotations and Orders below is resolved through the price-list override
described in the Pricing section above; nothing about the request/response shape changed.

## Quotations

- `GET /api/quotations?status=&salespersonId=&customerId=` (auth)
- `GET /api/quotations/:id`
- `POST /api/quotations` `{ customerId, items: [{ productId, quantity, discountPercent? }], notes? }`
  → server prices lines from product price/tax/discount, returns full quotation with items+totals
- `PATCH /api/quotations/:id/status` `{ status: "DRAFT"|"SENT"|"ACCEPTED"|"REJECTED" }`
- `POST /api/quotations/:id/convert` → creates and returns an Order from the quotation

## Orders

- `GET /api/orders?salespersonId=&customerId=&from=&to=` (auth)
- `GET /api/orders/:id`
- `POST /api/orders` `{ customerId, items: [{ productId, quantity, discountPercent? }], notes? }`
- `PATCH /api/orders/:id/status` `{ status: "CONFIRMED"|"DELIVERED"|"CANCELLED" }`

## Collections

- `GET /api/collections?salespersonId=&customerId=&from=&to=` (auth)
- `POST /api/collections` `{ customerId, orderId?, amount, method?, notes? }`
  method enum: `CASH|CHEQUE|UPI|BANK_TRANSFER|CARD|OTHER`

## Tracking (live GPS)

- `GET /api/tracking/live` (admin) → array of active salespersons with live snapshot:
  ```
  {
    id, name, avatarUrl, territory, isOnline, fieldWorkStatus, fieldWorkStartAt,
    lastLat, lastLng, lastSpeed, lastHeading, lastAccuracy, lastSeenAt, todayDistanceKm,
    todayVisits, todaySales, todayCollections,
    currentCustomerId, currentCustomer, currentVisitId, currentVisitStatus
  }
  ```
  `lastHeading`/`lastAccuracy`/`currentCustomerId`/`currentVisitId` are new fields added in this
  pass (the data already existed - `lastHeading`/`lastAccuracy` come from the salesperson's most
  recent `LocationPing` row, since the current-location cache on `Salesperson` only stores
  lat/lng/speed; `currentCustomerId`/`currentVisitId` are the id counterparts of the
  already-existing `currentCustomer` name / `currentVisitStatus`).
  **Bug fix:** `isOnline` here is no longer the raw stored flag - it's derived as
  `storedIsOnline && (now - lastSeenAt) < 3 minutes`. Previously, a salesperson using only the
  `POST /tracking/ping` REST fallback (no socket) whose device went dark (app killed, dead
  battery, lost connectivity) without an explicit `field-work/end` call would show as `isOnline:
  true` forever, because nothing ever flips the flag back for REST-only clients (the socket path
  has its own 20s disconnect grace period; there was no equivalent staleness check for REST). This
  was a real regression affecting the live map, not a cosmetic issue - flagged separately from the
  enhancements above.
- `GET /api/tracking/:salespersonId/route?date=YYYY-MM-DD` (admin or self) →
  `{ date, points: LocationPing[], stops: Visit[], distanceKm, durationMin, start, end }`
- `POST /api/tracking/ping` (salesperson) `{ lat, lng, speed?, accuracy?, heading?, recordedAt? }`
  (REST fallback; prefer the socket event `location:update` for live use, but this works when
  socket is unavailable — safe to call from a background sync queue)
- `POST /api/tracking/field-work/start` (salesperson) `{ lat, lng }`
- `POST /api/tracking/field-work/end` (salesperson) `{ lat, lng }`

## Targets (admin-wide)

Per-salesperson target create/read already existed at
`POST`/`GET /api/salespersons/:id/targets` (unchanged). This adds an admin-wide cross-salesperson
view and edit/delete, all `requireRole("ADMIN")`:

- `GET /api/targets?salespersonId=&territoryId=&period=&page=&pageSize=` (admin) →
  `{ items: [{ id, salespersonId, salespersonName, territory, period, periodStart, periodEnd, targetAmount, createdAt, updatedAt }], total, page, pageSize }`
- `PATCH /api/targets/:id` (admin) `{ period?, periodStart?, periodEnd?, targetAmount? }`
- `DELETE /api/targets/:id` (admin)

## Attendance (admin-wide)

Per-salesperson attendance already existed at `GET /api/salespersons/:id/attendance` (unchanged).
This adds a cross-salesperson, filterable, paginated view:

- `GET /api/attendance?salespersonId=&date=&dateFrom=&dateTo=&status=&page=&pageSize=` (auth) →
  `{ items: [{ id, salespersonId, salespersonName, avatarUrl, date, checkInAt, checkOutAt, checkInLat, checkInLng, checkOutLat, checkOutLng, totalDistanceKm, totalDurationMin, status }], total, page, pageSize }`
  - `status` is derived, not stored: `PRESENT` (checked in and out), `INCOMPLETE` (checked in,
    not out), `ABSENT` (never checked in). Filter by passing `status=PRESENT|INCOMPLETE|ABSENT`.
  - `date` filters to a single day; `dateFrom`/`dateTo` filter a range. Omit both for all dates.
  - Admins see everyone. A SALESPERSON caller sees only their own records plus their direct
    reports' (salespersons whose `managerId` points at them) - there's no separate "manager"
    role, a manager is just a salesperson with reports.

## Users (admin-only)

Manage login accounts and roles. All routes `requireRole("ADMIN")`.

- `GET /api/users?role=&isActive=&search=&page=&pageSize=` (admin) →
  `{ items: [{ id, name, email, phone, role, avatarUrl, isActive, createdAt, salesperson: { id, employeeCode, status, territory } | null }], total, page, pageSize }`
- `GET /api/users/:id` (admin) → single user, same shape plus full `salesperson` (with territory)
- `POST /api/users` (admin) `{ name, email, password, phone?, role: "ADMIN"|"SALESPERSON", employeeCode?, territoryId?, managerId? }`
  - `employeeCode` is **required** when `role` is `"SALESPERSON"` (400 otherwise) - creating a
    SALESPERSON user also creates its linked `Salesperson` record, via the same
    `createSalespersonAccount()` helper `POST /api/salespersons` uses, so the two never drift.
    Response is the created `User` (no `token`/password field).
  - `role: "ADMIN"` creates a plain admin user with no `Salesperson` record.
- `PATCH /api/users/:id` (admin) `{ name?, phone?, isActive?, role? }`
  - Setting `isActive: false` logs the user out immediately (every subsequent request, including
    ones on an already-open session, gets 401 - see the Auth section above).
  - Changing `role` is rejected (409) if it would create an inconsistent User/Salesperson
    linkage (e.g. switching to `"ADMIN"` while a `Salesperson` record still exists, or to
    `"SALESPERSON"` without one) - use `POST /api/users` to create a fresh account of the other
    kind instead.
- `POST /api/users/:id/reset-password` (admin) `{ password }` → `{ ok: true }`

None of the responses above ever include `passwordHash` (see the security-fix note below).

## Dashboard (admin)

- `GET /api/dashboard/summary` → all headline KPIs + `topPerformers[]` (see below)
- `GET /api/dashboard/salespersons?status=ACTIVE|INACTIVE|ALL` (drill-down for total/active cards)
- `GET /api/dashboard/sales?range=today|month` → orders list
- `GET /api/dashboard/visits?range=today|month` → visits list
- `GET /api/dashboard/followups?status=PENDING|OVERDUE|COMPLETED`
- `GET /api/dashboard/orders?range=today|month`
- `GET /api/dashboard/collections?range=today|month`
- `GET /api/dashboard/targets` → per-salesperson `{ salespersonId, name, avatarUrl, targetAmount, achieved, percent }`
- `GET /api/dashboard/top-performers?range=today|month`

`summary` shape:
```
{
  totalSalespersons, activeSalespersons, todaySales, monthlySales, todayVisits,
  pendingFollowups, todayOrdersCount, todayCollections, targetAmount, achievement,
  achievementPercent, topPerformers: [{ salespersonId, name, avatarUrl, sales }]
}
```

## Performance

- `GET /api/performance/:salespersonId` (admin or self) →
  `{ dailySales, weeklySales, monthlySales, targetAmount, achievementPercent, monthlyOrders,
     monthlyVisits, newCustomers, followUpsCompleted, monthlyCollections, totalDistanceKm,
     workingHours, avgOrderValue }`
- `GET /api/performance?range=today|week|month` (auth) → ranked leaderboard array with `rank`
  (available to both roles — salespeople use it to find their own row for comparison)

## Notifications

- `GET /api/notifications` (auth) → `{ items, unreadCount }`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## Error shape

Non-2xx responses: `{ error: string, details?: any }`. Zod validation errors return 400 with
`{ error: "Validation error", details: [...] }`.

## Security fix: no endpoint returns `passwordHash` anymore

Several endpoints that return a `Salesperson`/`Order`/`Visit`/`Quotation`/`Collection` with a
nested `salesperson.user` (via a Prisma `include: { user: true }`) were serializing the full
`User` row - including the bcrypt `passwordHash` - directly into the JSON response to any
authenticated caller. This affected `POST`/`PATCH /api/salespersons`, `POST /api/orders`,
`POST /api/quotations/:id/convert`, `POST /api/visits/:id/checkin|checkout`,
`POST /api/collections`, and `POST /api/tracking/field-work/start|end`. Fixed by adding
`server/src/lib/selects.ts` (`SAFE_USER_SELECT`) and using it everywhere a `User` relation is
included. Response shapes are otherwise unchanged - only the (never-consumed) `passwordHash`
field was removed - so no frontend code should need to change because of this fix.

## New environment variables / packages (server)

No new required environment variables - `CLIENT_ORIGIN`, `DATABASE_URL`, `JWT_SECRET`, `PORT`
are unchanged. `NODE_ENV` now has an effect it didn't before: set `NODE_ENV=production` in the
real deployment so the `sf_token` cookie gets `secure: true` (see the Auth section above for why
`sameSite` may also need revisiting for the real deployment domains).

New packages in `server/package.json`: `cookie-parser` + `@types/cookie-parser` (parses the
`sf_token` cookie on the Express middleware chain), `cookie` + `@types/cookie` (parses it
manually on the Socket.IO handshake, which doesn't go through Express middleware).

## Demo credentials (seeded)

- Admin: `admin@salesforcepro.com` / `Admin@123`
- Salesperson: `arjun@salesforcepro.com` / `Sales@123` (also kavya@, rohan@, ananya@, vikram@,
  neha@, karthik@, divya@ — all `@salesforcepro.com` / `Sales@123`)
