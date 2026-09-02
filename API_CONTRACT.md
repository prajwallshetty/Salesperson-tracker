# Backend API Contract

Base URL (dev): `http://localhost:4000`
All endpoints are prefixed with `/api`. Auth via header `Authorization: Bearer <token>`.
Uploaded files served statically at `http://localhost:4000/uploads/<filename>`.

Roles: `ADMIN`, `SALESPERSON`. Most endpoints scope data automatically to the logged-in
salesperson when called with a SALESPERSON token (no need to pass salespersonId).

## Real-time (Socket.IO)

Connect: `io("http://localhost:4000", { auth: { token: "<JWT>" } })`

- Admin sockets auto-join room `admins` and receive:
  - `location:update` → `{ salespersonId, name, lat, lng, speed, heading, recordedAt, todayDistanceKm, isOnline }`
  - `salesperson:status` → `{ salespersonId, isOnline, fieldWorkStatus }`
  - `notification:new` → `{ type, title, message, metadata, createdAt }`
- Salesperson sockets should emit `location:update` periodically while field work is active:
  `socket.emit("location:update", { lat, lng, speed?, accuracy?, heading?, recordedAt? })`
- Every socket auto-joins `user:<userId>` and receives `notification:new` targeted at them.

## Auth

- `POST /api/auth/login` `{ email, password }` → `{ token, user: { id, name, email, role, avatarUrl, salespersonId, salespersonStatus } }`
- `GET /api/auth/me` (auth) → current user object (same shape as above, minus token)

## Salespersons (admin unless noted)

- `GET /api/salespersons?status=&territoryId=&managerId=&search=&page=&pageSize=` → `{ items, total, page, pageSize }`
- `POST /api/salespersons` `{ name, email, password, phone?, employeeCode, territoryId?, managerId? }` → created salesperson (includes `user`, `territory`)
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

## Products

- `GET /api/products?search=&category=&isActive=&page=&pageSize=` (auth) → `{ items, total, page, pageSize }`
- `GET /api/products/categories` (auth) → `string[]`
- `POST /api/products` (admin) `{ name, sku, category, unit, price, taxPercent, discountPercent, description? }`
- `PATCH /api/products/:id` (admin) partial update
- `PATCH /api/products/:id/status` (admin) `{ isActive }`
- `POST /api/products/:id/image` (admin) multipart form field `image` → updates `imageUrl`
- `DELETE /api/products/:id` (admin)

## Customers

- `GET /api/customers?search=&territoryId=&salespersonId=&page=&pageSize=` (auth; salesperson sees only their own)
- `GET /api/customers/nearby?lat=&lng=&radiusKm=` (auth) → customers within radius sorted by distance, includes `distanceKm`
- `GET /api/customers/:id` (auth) → includes territory, salesperson, recent visits/orders/collections
- `POST /api/customers` (auth) `{ name, phone?, email?, address?, lat?, lng?, territoryId?, salespersonId?, notes? }`
- `PATCH /api/customers/:id` (auth)
- `DELETE /api/customers/:id` (admin)

## Visits

- `GET /api/visits?status=&salespersonId=&customerId=&from=&to=` (auth)
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
  `{ id, name, avatarUrl, territory, isOnline, fieldWorkStatus, fieldWorkStartAt, lastLat, lastLng, lastSpeed, lastSeenAt, todayDistanceKm, todayVisits, todaySales, todayCollections, currentCustomer, currentVisitStatus }`
- `GET /api/tracking/:salespersonId/route?date=YYYY-MM-DD` (admin or self) →
  `{ date, points: LocationPing[], stops: Visit[], distanceKm, durationMin, start, end }`
- `POST /api/tracking/ping` (salesperson) `{ lat, lng, speed?, accuracy?, heading?, recordedAt? }`
  (REST fallback; prefer the socket event `location:update` for live use, but this works when
  socket is unavailable — safe to call from a background sync queue)
- `POST /api/tracking/field-work/start` (salesperson) `{ lat, lng }`
- `POST /api/tracking/field-work/end` (salesperson) `{ lat, lng }`

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

## Demo credentials (seeded)

- Admin: `admin@salesforcepro.com` / `Admin@123`
- Salesperson: `arjun@salesforcepro.com` / `Sales@123` (also kavya@, rohan@, ananya@, vikram@,
  neha@, karthik@, divya@ — all `@salesforcepro.com` / `Sales@123`)
