# شو عبالك؟ — Progress & Handoff Log

> **Living status document.** AI agents read this at the start of every session and update it at the end.
> The spec lives in [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) (what to build) and [FRONTEND_DESIGN.md](./FRONTEND_DESIGN.md) (how it should look). This file tracks **actual progress against that spec**.

**Last updated:** 2026-05-29
**Current phase:** Phase 0 → Phase 1 (scaffolding complete + local stack running; feature work not started)

---

## 🔑 Key facts an agent needs before touching this repo

- **Monorepo:** Nx + pnpm workspaces. Stack per [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md).
- **Package manager:** pnpm 10. Build scripts are **blocked by default** — the allow-list lives in `pnpm-workspace.yaml` under `onlyBuiltDependencies` (`prisma`, `@prisma/*`, `bcrypt`, `@nestjs/core`, `nx`). Add to it if a new dep needs a postinstall.
- **Nx is pinned to `19.8.4`** (root `package.json`). `19.8.15` was unpublishable due to a registry mismatch on `@nrwl/tao` — do not bump blindly.
- **Design tokens are code:** [`packages/ui-components/src/tokens.ts`](./packages/ui-components/src/tokens.ts) is the single source of truth for colors/fonts/spacing. Every app imports from `@shu/ui-components`. Do not hardcode brand colors.
- **RTL is mandatory.** Mobile apps force RTL in `app/_layout.tsx`; admin sets `dir="rtl"` in the root layout.
- **Stitch design system already exists** — see the MCP section below. Do not create a duplicate.
- **Ports (local dev):** API runs on **3001** (`apps/api/.env` `PORT`), admin on **3000**. They collide if both use 3000 — keep them split.
- **Postgres runs on host port `5433`, not 5432.** A native PostgreSQL 16 Windows service already owns 5432 on this machine. `docker-compose.yml` maps `5433:5432` and `apps/api/.env` uses `127.0.0.1:5433` (explicit IPv4 — `localhost` resolves to IPv6 first and missed Docker's forward). Don't "fix" it back to 5432.
- **Docker CLI / compose:** Docker Desktop is installed but its `bin` may not be on a given shell's PATH. If `docker`/`docker compose` isn't found, prepend `/c/Program Files/Docker/Docker/resources/bin` to PATH (this also fixes the `docker-credential-desktop not found` error on pulls).
- **tsconfig `baseUrl` gotcha (bit us 3×):** every app's `tsconfig.json` MUST set `"baseUrl": "."` explicitly. They extend `tsconfig.base.json` which sets `baseUrl` at the repo root, so without the override the `paths` (`@/*`, `@shu/*`) and Next's `@/` alias resolve from the wrong directory → "module not found" 500s / TS2307. All four app tsconfigs are now fixed; keep it when adding apps.
- **RN components live behind a subpath:** RN primitives (`Button`/`Input`/`Card`) are at `@shu/ui-components/native`, NOT the root export. The root (`@shu/ui-components`) is tokens only, so the web admin never pulls react-native in. Apps map both in their tsconfig `paths`.
- **Tokens are plain TS** in `@shu/ui-components` and shared by web (Tailwind config mirrors them) and RN (StyleSheet reads them directly). Update tokens in one place.
- **Stitch screen HTMLs** are archived in `.design-refs/{admin,customer,business,driver}/` — the blueprints used for the port. Re-fetch fresh signed URLs via the `list_screens`/`get_screen` MCP tools (download URLs expire).
- **Password hashing uses `bcryptjs`, not `bcrypt`.** The native `bcrypt` failed to load its `.node` binding on this Windows setup (`Cannot find module bcrypt_lib.node`). Swapped to pure-JS `bcryptjs` (same API). Don't reintroduce native `bcrypt`.
- **The API runtime needs `@shu/shared-types` and `@shu/utils` COMPILED.** Node can't `require()` their `.ts` source, so both packages now have `main: dist/index.js` + a `build` script (`tsc -p tsconfig.build.json`, CommonJS). **Run `pnpm --filter @shu/shared-types build && pnpm --filter @shu/utils build` before `start:prod`/`start:dev`** (or whenever those packages change), else the API dies with `ERR_MODULE_NOT_FOUND .../enums`. The web/RN apps are unaffected — they import these via tsconfig `paths` to source, not `main`. TODO: wire these builds as an Nx `dependsOn` so they run automatically.
- **Orphaned node on :3001/:3000** — stopping a dev/prod API leaves a node holding the port; next start hits `EADDRINUSE`. Kill it: PowerShell `Get-NetTCPConnection -LocalPort 3001 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`. (A running API also locks the Prisma query-engine DLL → `prisma generate` fails with `EPERM`; stop node first.)
- **Prisma migrations must be non-interactive here.** `prisma migrate dev` prompts on warnings and the shell is non-interactive (it errors out). Instead: edit schema → `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script > migration.sql` into a new `prisma/migrations/<timestamp>_<name>/` dir → `prisma migrate deploy` → `prisma generate` (with node stopped). Don't leave stray dirs under `prisma/migrations/` (Prisma treats every subdir as a migration → P3015).

---

## ✅ What's been done

### Root workspace
- `package.json` (workspace scripts: `api`, `admin`, `customer`, `business`, `driver`, `db:up/down`, `build`, `lint`, `format`)
- `pnpm-workspace.yaml`, `nx.json`, `tsconfig.base.json` (with `@shu/*` path aliases)
- `.gitignore`, `.editorconfig`, `.prettierrc`, `.prettierignore`
- `docker-compose.yml` — Postgres 16 + Redis 7
- `README.md`

### packages/shared-types (`@shu/shared-types`)
- `enums.ts` — UserRole, OrderStatus, PaymentMethod, PaymentStatus, DriverStatus, BusinessCategory, DeliveryType
- `models.ts` — interfaces for every table in the handoff DB model
- `socket.ts` — `SocketEvents` constant + payload types for the 5 Socket.io events

### packages/utils (`@shu/utils`)
- `currency.ts` — `formatShekel()`
- `order-status.ts` — `canTransition()` state machine + Arabic status labels

### packages/ui-components (`@shu/ui-components`)
- `tokens.ts` — full design tokens from FRONTEND_DESIGN.md (colors, fonts, weights, sizes, spacing, radius, shadows, component dims)
- `status-badge.ts` — `STATUS_BADGE` map (bg/text/label per OrderStatus)

### apps/api (`@shu/api`) — NestJS
- `main.ts` (Swagger at `/docs`, global ValidationPipe, CORS), `app.module.ts`, `health.controller.ts`
- `prisma/prisma.module.ts` + `prisma.service.ts` (global)
- `prisma/schema.prisma` — **complete schema** for all tables + enums + relations from the handoff
- `prisma/seed.ts` — seeds the West Bank areas (region system / GPS workaround)
- `.env.example`
- **Verified:** `nest build` passes, Prisma client generates.

### apps/admin-dashboard (`@shu/admin-dashboard`) — Next.js 14 — **6 pages, all from Stitch designs**
- `(dashboard)` route group with shared shell: `Sidebar` (green, active-route highlight via `usePathname`), `TopBar`.
- Pages: **Dashboard** (stat cards, 2 bar charts, recent-orders table), **Businesses** (filters + data table + pagination), **Users** (tabs + table), **Drivers** (table), **Reports/Finance** (period selector, 4 cards, transactions table). All RTL, brand-themed, mock data.
- Shared components: `stat-card`, `status-badge`, `data-table` (TableCard/StatusDot/RowActions), `page-placeholder`, `nav-items`.
- `tailwind.config.ts` extended with the Stitch token set; `globals.css` loads Cairo/Montserrat + Material Symbols.
- **Verified:** `next build` compiles 10 routes; pages render 200 with content (screenshotted, matches design).

### apps/customer-app — Expo SDK 51 — **12 screens, ported from Stitch**
- Nav: root Stack + `(auth)` group (login/register/otp) + `(tabs)` group (Home/Orders/Profile) + stack screens `business/[id]`, `cart`, `tracking`.
- Screens: Splash→Onboarding(3 slides)→Login/Register/OTP→Home(search, promo, categories, business cards, cart FAB)→Business Detail(tabs, products, cart bar)→Cart(qty, summary, payment)→Tracking(vertical stepper, driver card)→Orders(tabs)→Profile(settings list).
- `src/theme.ts` (re-exports tokens), `src/mock.ts` (mock data).
- **Verified:** `tsc --noEmit` clean.

### apps/business-app — Expo SDK 51 — **5 screens**
- Nav: Stack + `(tabs)` (Dashboard/Menu/Analytics) + stack `order/[id]`, `driver-selection`.
- Screens: Dashboard(store toggle, 4 stat cards, order tabs new/active/done), Order Detail(items, note, status action buttons PENDING→CONFIRMED→PREPARING→READY), Driver Selection(filters, driver cards), Menu Management(availability toggles), Analytics(period, cards, bar chart, top products).
- **Verified:** `tsc --noEmit` clean.

### apps/driver-app — Expo SDK 51 — **4 screens**
- Nav: Stack + `(tabs)` (Home/History) + stack `request-alert` (modal), `active-delivery`.
- Screens: Home(availability toggle + area, today stats, current order, simulate-request button), Request Alert(countdown timer, accept/reject), Active Delivery(horizontal stepper, business/customer info, cash callout, stage buttons), Delivery History(monthly summary + list).
- **Verified:** `tsc --noEmit` clean.

### packages/ui-components — RN primitives added
- `src/native/` — `Button`, `Input`, `Card` (RN components built from tokens), exported via `@shu/ui-components/native` subpath. Web admin imports tokens from `@shu/ui-components` (no RN deps pulled in).

### Design references
- All 22 Stitch screen HTMLs downloaded into `.design-refs/{admin,customer,business,driver}/` as the port blueprints.

### Dependencies & verification
- `pnpm install` completed (Nx pinned). Added `@react-navigation/bottom-tabs` (expo-router Tabs needs it) + `@types/react` in ui-components.
- **All verified:** admin `next build` (10 routes) ✓; customer/business/driver `tsc --noEmit` ✓; ui-components lint ✓. Mobile apps not yet run on a device/emulator (no QR/emulator from this environment).

### Stitch MCP (design)
- MCP connected and verified.
- Design system **"Heritage Pulse"** already exists in Stitch project **"Multilingual Web Interface Development"** (project ID `12297570441858941970`), generated from FRONTEND_DESIGN.md — correct palette, Cairo+Montserrat, RTL, ~30 screens. **No duplicate created.**

---

## ⚠️ What's missing / not done

### API (apps/api) — auth + core domain done
- ✅ **Auth module** (`src/auth/`): `POST /auth/register` (bcryptjs hash), `POST /auth/login` (JWT), `GET /auth/me` (JWT guard), `POST /auth/otp/request|verify` (stub, devCode `0000`). Plus `JwtStrategy`, `JwtAuthGuard`, `RolesGuard` + `@Roles()`, `@CurrentUser()`.
- ✅ **Areas** (`GET /areas` — public).
- ✅ **Businesses** (`src/businesses/`): `GET /businesses` (filter category/area/search), `GET /businesses/:id` (with available products), `GET /businesses/mine`, `POST` + `PATCH` (BUSINESS role, ownership-checked).
- ✅ **Products** (`src/products/`): `GET /products?businessId=` (public), `POST`/`PATCH`/`DELETE` (BUSINESS role, must own the parent business).
- ✅ **Orders** (`src/orders/`): `POST /orders` (CUSTOMER — server computes total from real product prices + area delivery fee, writes items + initial history in one create), `GET /orders` (role-scoped: customer=own, business=its orders, driver=assigned, admin=all), `GET /orders/:id` (view-authz), `PATCH /orders/:id/status` (validates via `@shu/utils` `canTransition`, enforces who-can-do-which-transition, appends `OrderStatusHistory`).
  - **Transition authority (matches the app flows):** CONFIRMED/PREPARING/READY → business owner; **PICKED_UP → business owner assigns the driver (must pass `driverId`)** — the "اختيار سائق" screen is in the *business* app; **DELIVERED → assigned driver only** (driver app "تم التسليم"); CANCELLED → customer (only while PENDING) or business.
- ✅ **Drivers** (`src/drivers/`): `POST /drivers/register` (DRIVER creates profile, one per user), `GET /drivers/me`, `PATCH /drivers/me/status` (toggle AVAILABLE/BUSY/OFFLINE + change area — the driver-app availability toggle), `GET /drivers/available?areaId=` (BUSINESS/ADMIN — the driver-selection screen), `GET /drivers` (ADMIN). Reads include the driver's user (name/phone) + area.
- ✅ **Payments** (`src/payments/`): a `Payment` row is created with every order (nested in the order's create, atomic).
  - **Cash:** created `PENDING`; auto-settles to `PAID` inside the same transaction when the order hits `DELIVERED` (driver collected the cash). This is the live default.
  - **Online (ELECTRONIC):** built to be swappable. A `PaymentProvider` interface (`providers/payment-provider.interface.ts`, DI token `PAYMENT_PROVIDER`) is implemented today by `MockPaymentProvider` (returns a fake checkout URL + reference; confirm flips PENDING→PAID, or →FAILED if `{paid:false}`). **To go live, implement the interface for a real gateway and change the one binding in `PaymentsModule`** — no service/controller changes. `POST /payments/confirm` is the gateway webhook home (public; provider verifies signature). `GET /payments/:orderId` reuses order view-authz.
  - **Schema:** added `provider`, `reference` (unique), `createdAt`, `updatedAt` to `Payment` (migration `20260529120447_payment_gateway_fields`). Orders now `include` their payment.
  - **Verified end-to-end:** cash → PENDING then PAID on delivery (response + DB); electronic → PENDING + checkout URL → confirm → PAID; failed confirm → FAILED.
- ✅ **Reviews** (`src/reviews/`): `POST /reviews` (CUSTOMER, own order, only after DELIVERED, once) — creating a review recomputes the business's avg rating and (if rated) the driver's avg rating in one transaction. `GET /reviews/business?businessId=` and `GET /reviews/driver?driverId=` (public). Schema gained `comment`, `createdAt`. **Verified:** review set business→5, driver→4; duplicate 409; pre-delivery review 400.
- ✅ **Users** (`src/users/`, ADMIN-only): `GET /users` (filter role/status/search), `GET /users/:id`, `PATCH /users/:id/status` (ACTIVE/SUSPENDED/BANNED). Never returns password hashes (explicit `select`). Admin accounts protected from status changes. Added `UserStatus` enum + `User.status` (migration `20260529122029_users_status_and_review_fields`). **Suspended/banned users are blocked both at login AND on existing tokens** (check in `AuthService.login` + `JwtStrategy.validate`). **Verified:** non-admin 403; password not leaked; suspend → login 403 + existing token 403; admin status-change 403.
- **Verified end-to-end against live DB — FULL lifecycle:** business→product→order; total = items + delivery fee; customer-confirm 403; illegal PENDING→READY 400; business CONFIRMED→PREPARING→READY; driver registers (OFFLINE) → not in `available` → goes AVAILABLE → appears in `available`; assign without `driverId` 400; **business assigns READY→PICKED_UP**; **driver completes PICKED_UP→DELIVERED** (6 history rows); driver sees only assigned orders; customer blocked from `/drivers/register` 403; duplicate driver 409. All confirmed in Postgres.
- **All domain modules are now built** (auth, areas, businesses, products, orders, drivers, payments, reviews, users). Not yet built: image uploads (S3/Cloudinary), FCM push.
- No **Socket.io gateway** (events are typed in shared-types but not implemented).
- No **Redis** integration (ioredis is installed, not wired).
- DTOs + class-validator + role guards are in place for the built modules; **no automated tests yet** (verified manually via curl/REST).
- ~~**DB not migrated yet**~~ ✅ **Done** — Docker Desktop installed, Postgres+Redis up, initial migration `20260528223816_init` applied, areas seeded (22 rows). `.env` created. API verified live on :3001 (`/health` 200, Swagger at `/docs`).
- Firebase FCM, S3/Cloudinary uploads: not started.

### Frontend ↔ data wiring — NOT connected
- **All screens (admin + 3 mobile apps) use mock/static data.** No API client, no React Query setup, no Zustand stores, no Socket.io-client wiring (deps installed only). Forms don't submit; nav uses `router.replace` to fake auth.
- Admin: Recharts + TanStack Table installed but **charts/tables are hand-built (CSS bars / plain tables)**, not yet using those libs. shadcn/ui not initialized.
- Mobile apps **not yet run on a device/emulator** — verified via typecheck only. Images in designs replaced with emoji placeholders.

### Infra
- No CI (GitHub Actions), no Nginx, no Sentry, no deploy config.
- Git: repo at **github.com/YousefNijim/shu-abalak** (private). Lots of **uncommitted work** since the initial commit (admin pages, all mobile screens, port changes).

---

## 👉 Next steps (suggested order)

1. ~~**API auth module**~~ ✅ DONE.
2. ~~**API orders + businesses + products modules**~~ ✅ DONE (+ areas).
3. ~~**Drivers module**~~ ✅ DONE — full order lifecycle (PENDING→DELIVERED) now works end-to-end.
4. ~~**Payments module**~~ ✅ DONE — cash settles on delivery; online infra ready behind `PaymentProvider` (mock today). To enable real online payments: implement `PaymentProvider` for a gateway + rebind `PAYMENT_PROVIDER` in `PaymentsModule`.
5. ~~**Reviews + Users modules**~~ ✅ DONE — all domain modules complete.
6. **Socket.io gateway** — implement the 5 events from `@shu/shared-types` `SocketEvents`; wire Redis for real-time state. (`order:new` on create, `order:status_update` on each transition.)
7. **Wire frontends to the API** — add an axios client + React Query in each app; replace mock data in the (already-built) screens with live calls. Add Zustand stores (cart, auth) and Socket.io-client.
8. **Infra** — CI (GitHub Actions), Sentry, deploy config. Smaller leftovers: image uploads (S3/Cloudinary), FCM push, real SMS for OTP, automated tests, driver→BUSY-on-assignment enhancement.

---

## 🗂️ How to use this file (for AI agents)

- **Read this first**, then the two spec files, before starting work.
- When you finish work: move items from *What's missing* → *What's been done*, update *Last updated* and *Current phase*, and re-order *Next steps*.
- Record any **non-obvious decisions or gotchas** in *Key facts* (e.g. the Nx pin, the pnpm build allow-list) so the next agent doesn't rediscover them.
