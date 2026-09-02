# Vite → Next.js Migration Plan

## Scope & non-goals

- Two existing Vite SPAs — `admin-web/` (admin dashboard) and `sales-app/` (salesperson
  field PWA) — are migrated **in place** to Next.js App Router. Directory names are kept
  so the rest of the repo (README, scripts, npm workspaces) doesn't need touching.
- `server/` (Express + Prisma + PostgreSQL + Socket.IO) is **not touched at all**. It was
  already a standalone backend, not code living inside the Vite app, so per the migration
  brief ("preserve the existing backend/API architecture if it is already working") there
  is nothing to restructure into Route Handlers. Both Next.js apps keep calling it exactly
  as before (REST + Socket.IO), just from a different frontend framework.
- No Prisma migration, seed, reset, or schema change of any kind. No production data is
  read/written by this migration beyond the same read/write API calls the apps already made.

## Version decision

- **Next.js 16.3.4** (latest stable on npm at migration time) — confirmed its peer
  dependency range is `react: "^18.2.0 || ^19.0.0"`, so it runs on **React 18.3.1**
  (unchanged from the Vite apps) without forcing a React 19 upgrade. That matters because
  `react-leaflet@4.x` (used for the live tracking / route maps) only supports React 18;
  `react-leaflet@5` requires React 19. Staying on React 18 keeps every existing UI
  dependency (react-leaflet 4, recharts 2, zustand 4, socket.io-client, react-hot-toast,
  date-fns, idb) working unchanged — "latest stable Next.js compatible with the existing
  project," read literally.
- App Router (not Pages Router), TypeScript, ESLint via `eslint-config-next` flat config.
- PWA (installability/offline shell for the field app) via `@ducanh2912/next-pwa`
  (actively maintained App Router-compatible fork of `next-pwa`) replacing
  `vite-plugin-pwa`.

## Per-app structure

### `admin-web/` → Next.js

```
app/
  layout.tsx            server component: <html>/<body>, fonts, imports Providers
  providers.tsx          "use client": Toaster, any app-wide client context
  page.tsx               redirects "/" -> "/dashboard" (or renders dashboard directly)
  login/page.tsx
  dashboard/page.tsx
  salespersons/page.tsx
  salespersons/[id]/page.tsx
  products/page.tsx
  customers/page.tsx           (new — thin page over already-existing GET /api/customers)
  customers/[id]/page.tsx      (new — over already-existing GET /api/customers/:id)
  tracking/page.tsx
  routes/page.tsx
  visits/page.tsx               (new — over already-existing GET /api/visits, admin-wide)
  leads/page.tsx
  follow-ups/page.tsx           (renamed from /followups to match requested convention)
  quotations/page.tsx
  orders/page.tsx
  collections/page.tsx
  performance/page.tsx
  reports/page.tsx              (new — composes existing dashboard/performance endpoints;
                                  no new backend logic, no fabricated data)
  notifications/page.tsx
  settings/page.tsx             (new — minimal: admin profile + logout; no backend exists
                                  for app settings, so nothing invented beyond that)
components/   (from src/components, src/layout)
lib/          (api.ts, socket.ts, format.ts)
hooks/
store/        (auth.ts — zustand, unchanged logic)
types.ts
public/
```

Notes on the 4 additions (Customers, Visits, Reports, Settings): these were not top-level
admin pages in the Vite app (customers were only reachable via an "assign customers" modal;
visits only via a salesperson's detail tabs), but they're explicitly named in both the
requested Next.js structure and the final verification checklist, and the backend already
has full, real endpoints for the first three. Adding thin list/detail pages over already-
real data is a structural adaptation, not new feature/business-logic invention. Settings is
kept intentionally minimal (no fake toggles that don't persist anywhere).

### `sales-app/` → Next.js

Route names follow the app's actual feature set rather than the admin structure, per
"adapt the structure to the existing application rather than blindly recreating it":

```
app/
  layout.tsx / providers.tsx
  login/page.tsx
  home/page.tsx                 (dashboard: target, stats, Start/End Field Work)
  customers/page.tsx
  customers/[id]/page.tsx
  visits/[id]/page.tsx          (check-in/out flow)
  leads/page.tsx
  follow-ups/page.tsx
  quotations/page.tsx
  quotations/[id]/page.tsx
  orders/page.tsx
  orders/[id]/page.tsx
  collections/page.tsx
  performance/page.tsx
  notifications/page.tsx
  more/page.tsx (profile/logout)
components/  lib/  hooks/  store/  types/  public/
```

## Cross-cutting technical decisions

- **Auth stays client-side JWT-in-localStorage** (unchanged design) — there is no server
  session to move to cookies/middleware, and redesigning auth is explicitly out of scope
  ("do not redesign... unless required for Next.js compatibility"; it isn't required).
  `store/auth.ts` (zustand) is unchanged logic; localStorage access is guarded to
  client-only (`typeof window !== "undefined"` / effects), matching the existing
  `hydrated` pattern so SSR never touches `localStorage`.
- Because the app is JWT/localStorage-authenticated and heavily interactive (live sockets,
  maps, charts, forms), most route pages remain **Client Components** — this is the honest
  outcome of the framework's own guidance ("use client for... interactive/state/websocket/
  maps/charts", which is nearly every page here). `layout.tsx` stays a Server Component;
  any purely static shell pieces stay server-rendered.
- **Leaflet maps**: `react-leaflet`/`leaflet` touch `window`; loaded via
  `next/dynamic(() => import(...), { ssr: false })` wrapper components to avoid
  `window is not defined` during SSR/build.
- **Routing**: `react-router-dom` (`useNavigate`, `useParams`, `<Link>`) →
  `next/navigation` (`useRouter`, `useParams`, `usePathname`) and `next/link`.
- **Env vars**: Vite's dev-only `/api`, `/uploads`, `/socket.io` proxy (vite.config.ts)
  doesn't carry over automatically. Both apps now call the Express backend via an
  **absolute** origin from `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000`) for axios,
  socket.io-client, and `<img>`/upload URLs. This is the only env var either app needs
  client-side, so it's the only one prefixed `NEXT_PUBLIC_`. Nothing secret (DB URL, JWT
  signing secret) ever lived in the frontends and nothing secret is introduced now — those
  stay exclusively in `server/.env`. The backend's `CLIENT_ORIGIN` allow-list gets the new
  Next.js dev ports added so CORS keeps working.
- **Images**: kept as plain `<img>` tags (as before) rather than adopting `next/image`,
  which would need a `remotePatterns` allow-list for the backend's `/uploads` host and isn't
  required for correctness — avoids scope creep.

## Ports

- `server` unchanged: `:4000`
- `admin-web` (Next.js dev/start): `:5173` (kept, via `next dev -p 5173` / `next start -p 5173`)
- `sales-app` (Next.js dev/start): `:5174` (same convention)

Keeping the same ports means no README/env churn beyond swapping the proxy for
`NEXT_PUBLIC_API_URL`.

## Execution order

1. Scaffold Next.js config/package.json for both apps (this file's author, to avoid two
   agents racing on `npm install`/root lockfile).
2. `npm install` once at the repo root.
3. Verify both `next dev` boot with a placeholder page.
4. Migrate `admin-web` and `sales-app` page-by-page in parallel (isolated directories, no
   file overlap).
5. Verify: `next build` + `next start` for both, zero TypeScript/ESLint errors, no SSR
   `window`/`document` errors, auth/role guards behave identically, live tracking socket
   flow still works, GPS tracking flow still works.
6. Remove now-dead Vite files (`vite.config.ts`, `index.html`, `src/main.tsx`, etc.) only
   after the above is green.
7. Commit and push. `server/` and the database are untouched throughout.
