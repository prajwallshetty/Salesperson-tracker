# SalesGrid — Sales Force Management System

A full-stack Sales Force Management System with a real-time Admin Web Dashboard
and a mobile-first Salesperson Field App (PWA), built on a shared Node/Express +
PostgreSQL + Socket.IO backend.

```
Salesperson Mobile App (React PWA)
        ↓  REST + WebSocket (GPS pings, visits, orders...)
Backend API (Express + Prisma)
        ↓
PostgreSQL Database
        ↓
Real-time Location Service (Socket.IO)
        ↓
Admin Web Dashboard (React)
        ↓
Interactive Live Map (Leaflet / OpenStreetMap)
```

## Project structure

```
server/       Express + TypeScript + Prisma (PostgreSQL) + Socket.IO API
admin-web/    Admin dashboard — Next.js 16 (App Router) + TypeScript + Tailwind
sales-app/    Salesperson field PWA — Next.js 16 (App Router) + TypeScript + Tailwind
API_CONTRACT.md   Full REST + Socket.IO contract shared by both frontends
BILLING.md        Multi-tenant subscriptions, Razorpay setup, Super Admin platform
MIGRATION_PLAN.md Vite → Next.js migration plan and rationale
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or update `DATABASE_URL`)

## First-time setup

```bash
# 1. Start PostgreSQL (if not already running)
service postgresql start
su postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
su postgres -c "psql -c \"CREATE DATABASE salesforce_db;\""

# 2. Install all workspace dependencies
npm install

# 3. Configure environment
cp server/.env.example server/.env   # already points at postgresql://postgres:postgres@localhost:5432/salesforce_db
# admin-web/.env.local and sales-app/.env.local already set NEXT_PUBLIC_API_URL=http://localhost:4000

# 4. Run migrations + seed demo data
cd server && npx prisma migrate deploy && cd ..
npm run seed

# 5. Run everything (three terminals, or use scripts/dev.sh)
npm run dev:server   # http://localhost:4000  (Express + Socket.IO)
npm run dev:admin    # http://localhost:5173  (Next.js, Turbopack)
npm run dev:sales    # http://localhost:5174  (Next.js, webpack — see note below)
```

Or simply:

```bash
./scripts/dev.sh
```

Each frontend also supports the standard Next.js production flow independently:
`npm run build && npm start` (from `admin-web/` or `sales-app/`).

> **Why `sales-app` runs webpack instead of Turbopack**: it uses `@ducanh2912/next-pwa`
> for the installable PWA shell (offline caching, service worker), which is built on
> `workbox-webpack-plugin` and has no Turbopack equivalent yet. Next.js 16 defaults to
> Turbopack, so `sales-app`'s `dev`/`build` scripts pass `--webpack` explicitly — the
> officially documented opt-out — to keep PWA generation working. `admin-web` has no such
> constraint and uses Turbopack (the default) normally.

## Demo credentials

| Role        | Email                          | Password   |
|-------------|---------------------------------|------------|
| Admin       | admin@salesforcepro.com         | Admin@123  |
| Salesperson | arjun@salesforcepro.com         | Sales@123  |
| Salesperson | kavya@salesforcepro.com         | Sales@123  |
| Salesperson | rohan@ / ananya@ / vikram@ / neha@ / karthik@ / divya@ salesforcepro.com | Sales@123 |

## Architecture notes

- **Database**: PostgreSQL via Prisma ORM. Schema in `server/prisma/schema.prisma` covers
  users, salespersons, territories, customers, products, targets, attendance, GPS location
  pings, visits, leads, follow-ups, quotations, orders, collections, and notifications.
- **Auth**: JWT bearer tokens, role-based (`ADMIN` / `SALESPERSON`). Most endpoints
  auto-scope data to the logged-in salesperson.
- **Real-time location**: the field app streams GPS points over a Socket.IO connection
  (falling back to a REST endpoint, `POST /api/tracking/ping`, when the socket is down).
  The server persists each point, updates the salesperson's live snapshot (position, speed,
  today's distance via haversine accumulation), and broadcasts `location:update` /
  `salesperson:status` to all connected admin sockets — no polling required on the dashboard.
- **Offline handling**: the field app buffers GPS points in IndexedDB when both the socket
  and the REST fallback fail, and flushes them in order once connectivity returns. The
  server also de-duplicates near-identical points (<5m / <3s apart) to absorb buffered bursts.
- **No simulated GPS**: all location data originates from the browser Geolocation API on a
  real device/browser session. The seed script fabricates *historical* demo routes only so
  the dashboards aren't empty on first run — it never fakes a *live* location feed.
- **File uploads**: product images and visit photos are stored on local disk under
  `server/uploads/` and served statically at `/uploads/<filename>`. Swap for S3/Cloud Storage
  for a real production deployment.
- **Frontend architecture**: both `admin-web` and `sales-app` are Next.js 16 App Router
  apps on React 18.3 (Next 16's peer range explicitly allows React 18.2+, which keeps
  `react-leaflet@4`, `recharts@2`, and `zustand@4` working without a React 19 rewrite).
  The backend is a separate, already-standalone Express/Socket.IO service — both frontends
  call it over plain REST/WebSocket via `NEXT_PUBLIC_API_URL`, the same architecture as
  before, just without Vite's dev-only `/api` proxy. Auth stays client-side (JWT in
  localStorage, no server session), matching the original design; protected routes are
  grouped under an `(app)`/`(dashboard)` route group whose layout does the auth/role
  check and renders the persistent nav chrome, and Leaflet/react-leaflet (which touch
  `window`) are loaded via `next/dynamic(..., { ssr: false })` to avoid SSR crashes.

## Known trade-offs (documented, not hidden)

- Web `Geolocation.watchPosition` only reliably tracks in the foreground/briefly backgrounded
  tab — true OS-level background tracking would require a native wrapper (e.g. Capacitor).
  The field app keeps tracking alive across in-app navigation and is explicit in the UI about
  when tracking is active.
- The dev environment uses a locally installed PostgreSQL for zero-config setup; point
  `DATABASE_URL` at a managed Postgres instance for real deployment.
