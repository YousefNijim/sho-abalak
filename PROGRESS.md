# شو عبالك؟ — Progress & Handoff Log

> **Living status document.** AI agents read this at the start of every session and update it at the end.
> The spec lives in [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) (what to build) and [FRONTEND_DESIGN.md](./FRONTEND_DESIGN.md) (how it should look). This file tracks **actual progress against that spec**.

**Last updated:** 2026-06-01
**Current phase:** Phase 33 (Security + crash fixes — Batch 1 of BUG_AUDIT.md)

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
- **Cairo font strings use underscores, not hyphens:** `fontFamily: 'Cairo_700Bold'` (from `@expo-google-fonts/cairo`) — NOT `'Cairo-Bold'`. The old screens used hyphens which rendered as system fallback. All screens now use `fontFamily.*` tokens from `tokens.ts`.
- **reanimated path alias in tsconfigs:** each app's `tsconfig.json` has `"react-native-reanimated": ["node_modules/react-native-reanimated"]` so that tsc resolves it from the app's own node_modules when typechecking shared ui-components source. Without this, Button.tsx causes TS2307 during `tsc --noEmit`.
- **`@gorhom/bottom-sheet` + `react-native-reanimated` + `react-native-gesture-handler` must all be present** for BottomSheet to work at runtime. If gesture-handler missing, BottomSheet crashes.
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

### apps/admin-dashboard (`@shu/admin-dashboard`) — Next.js 14 — **10 pages, all from Stitch designs & spec** — ✅ **FULLY WIRED TO LIVE API**
- `(dashboard)` route group with shared shell: `Sidebar` (green, active-route highlight via `usePathname`), `TopBar`. Protected by Next.js middleware / layout auth guard reading cookies. Updated sidebar navigation parameters to include all active modules.
- Pages: 
  - **Login:** secure administrator auth, session cookie storage, protected route middleware.
  - **Dashboard:** overview with live stats, alert tickers for stuck orders/registrations, Recharts charts (weekly bar, monthly bar, and method split pie chart), recent transactions table.
  - **Orders:** TanStack table with status filtering tabs, Left Drawer detailing address snapshots, items breakdown, status timelines, reassigning drivers, force status updates, and refund overrides.
  - **Businesses:** approves/rejects registrations, manual isOpen override toggle, custom commission rate slider adjustments.
  - **Users:** customer/business/driver tabs, suspend/unsuspend accounts, reset password triggers, live notifications push.
  - **Drivers:** live tracking status grid, deliveries/earnings log drawer, regional default areas re-assignments.
  - **Areas [NEW]:** complete delivery zones list (TanStack), edit default delivery fee modal, add new zone sliding modal, delete zone red overlay.
  - **Reviews [NEW]:** moderator dashboard listing ratings and customer comments, business or driver filters, delete offensive comments (automates PostgreSQL ratings recomputations).
  - **Reports/Finance:** TanStack table listing transactions, backend reports aggregated query per period ("today", "week", "month", "custom"), custom period range calendars, dynamic high-fidelity CSV data sheets exporter.
  - **Settings:** form inputs for Default Commission rate, Default Base Delivery fee, and App toggles (Customer, Business, Driver) for emergency maintenance blocks.
- Shared components: `stat-card`, `status-badge`, `data-table`, `page-placeholder`, `nav-items`.
- `tailwind.config.ts` extended with the Stitch token set; `globals.css` loads Cairo/Montserrat + Material Symbols.
- **Verified:** Wires live data queries using React Query and `@shu/api-client`. Next build compiles all 10 routes dynamically with 0 TypeScript compilation errors!

### apps/customer-app — Expo SDK 51 — **12 screens, ported from Stitch** — ✅ **FULLY WIRED TO LIVE API**
- Nav: root Stack + `(auth)` group (login/register/otp) + `(tabs)` group (Home/Orders/Profile) + stack screens `business/[id]`, `cart`, `tracking`.
- Zustand stores: `auth.store` (persists token and profile using AsyncStorage, injects token in Axios client headers), `cart.store` (fully functional single-business shopping cart).
- Screens: Splash (automatic auth checks and redirects) -> Login & Register & OTP (real backend signup with live area selector & verification) -> Home (live search, category filters, cart quantity FAB) -> Business Detail (live products, dynamic tab categories) -> Cart (single-business items list, qty update, cash vs electronic payment option, place order mutation) -> Tracking (stepper state matching real order status, real-time polling, live driver/business cards) -> Orders (active vs past lists, working Reorder action) -> Profile (live profile info, logout).
- `src/theme.ts` (re-exports tokens), `src/mock.ts` (mock data).
- **Verified:** Compiles perfectly, passing `tsc --noEmit` typechecks with zero errors.

### apps/business-app — Expo SDK 51 — **5 screens** — ✅ **FULLY WIRED TO LIVE API**
- Nav: Stack + `(tabs)` (Dashboard/Menu/Analytics) + stack `order/[id]`, `driver-selection`.
- Zustand store: `auth.store` (persisted token/profile).
- Screens: Dashboard (live store open/close toggle, dynamic today order stats/revenue calculations, status sections), Order Detail (live products list, notes, status change mutations PENDING→CONFIRMED→PREPARING→READY), Driver Selection (loads dynamic available drivers filtered by area, status transition READY→PICKED_UP with selected driver assignment), Menu Management (dynamic product availability switch, products CRUD), Analytics (live revenues, weekly chart levels, top products computed from actual backend data).
- **Verified:** Compiles perfectly with zero TypeScript errors.

### apps/driver-app — Expo SDK 51 — **4 screens** — ✅ **FULLY WIRED TO LIVE API**
- Nav: Stack + `(tabs)` (Home/History) + stack `request-alert` (modal), `active-delivery`.
- Zustand store: `auth.store` (persisted token/profile).
- Screens: Home (driver details, online/offline availability switch, live deliveries/earnings stats, active PICKED_UP order link), Request Alert (driven by live `driver:request` socket event), Active Delivery (dynamic customer/business detail, dynamic cash collection vs electronic payment notice, direct native telephone dialers, DELIVERED state update mutation), Delivery History (dynamic monthly earnings aggregate, detailed delivered orders log).
- **Verified:** Compiles perfectly with zero TypeScript errors.

### packages/ui-components — RN primitives added
- `src/native/` — `Button`, `Input`, `Card` (RN components built from tokens), exported via `@shu/ui-components/native` subpath. Web admin imports tokens from `@shu/ui-components` (no RN deps pulled in).

### Design references
- All 22 Stitch screen HTMLs downloaded into `.design-refs/{admin,customer,business,driver}/` as the port blueprints.

### Dependencies & verification
- `pnpm install` completed (Nx pinned). Added `@react-navigation/bottom-tabs` (expo-router Tabs needs it) + `@types/react` in ui-components.
- **All verified:** admin `next build` (10 routes) ✓; customer/business/driver `tsc --noEmit` ✓; ui-components lint ✓. Mobile apps not yet run on a device/emulator (no QR/emulator from this environment).

### Socket.io Gateway — ✅ **FULLY OPERATIONAL & CONNECTED**
- **NestJS Socket.io Server:** Created a global `GatewayModule` and registered `SocketGateway` (`apps/api/src/gateway`). Securely intercepts connection handshakes and validates access tokens using global `JwtService`. Automatically handles custom user rooms (`user:${id}`), business owner rooms (`business:owner:${id}`), and available drivers.
- **Transactional Service Pushes:** Integrated real-time triggers in `OrdersService` and `DriversService` to push socket events (`order:new` to merchants, `order:status_update` to customers, `driver:request` to assigned drivers, and `driver:status_change` when driver toggles availability) instantaneously.
- **Frontend Clients Hook & Listeners:** Created a unified `useSocket` persistent connection singleton hook with Zustand auth token synchronization and connection fail-safes.
  - *Customer App:* Tracking screen listens to `order:status_update` for immediate Cache invalidation and instant visual updates, removing 5-second polling delays.
  - *Business App:* Dashboard tab listens to `order:new` to instantly trigger alert dialogs.
  - *Driver App:* Home screen listens to `driver:request` to automatically open the dispatch request alert popup in real-time with live order parameters.

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
- **All domain modules are now built** (auth, areas, businesses, products, orders, drivers, payments, reviews, users). ✅ **FCM push notifications now built & wired** (see Phase 27). Not yet built: durable image uploads (S3/Cloudinary — local-disk today).
- ✅ **Socket.io Gateway is fully operational & wired.**
- No **Redis** integration (ioredis is installed, not wired).
- DTOs + class-validator + role guards are in place for the built modules; **comprehensive E2E order lifecycle integration tests successfully implemented and passing** (Jest supertest running under `pnpm --filter @shu/api test`).
- ✅ **Firebase FCM: DONE** (Phase 27). S3/Cloudinary uploads: not started (local-disk only).

### Frontend ↔ data wiring — ✅ **100% CONNECTED**
- ✅ **Admin Dashboard (Next.js)**: Fully connected to `@shu/api-client` and React Query. Handles dynamic dashboard stats, businesses filters/tables, users list & suspend actions, active drivers list, orders table, and reports data calculations.
- ✅ **Customer App (Expo/RN)**: Fully connected, compiling, and type-safe! Features Zustand auth & single-business cart stores, Axios HTTP integration, TanStack Query integration, splash auto-redirect, login, register, OTP verification, live home search & category filter, dynamic product category tabs, place order mutation, live tracking polling, and orders lists.
- ✅ **Business App (Expo/RN)**: Fully connected, compiling, and type-safe! Includes auth store, dynamic status toggling, preparation lifecycle mutations, available driver queries, and product management actions.
- ✅ **Driver App (Expo/RN)**: Fully connected, compiling, and type-safe! Wires status mutations, dynamic delivery items rendering, native dialers, final settlement status changes, and history aggregates.

### Infra — ✅ **100% SETUP & OPERATIONAL**
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) set up to build and test monorepo topological imports automatically.
- Production multi-stage `Dockerfile` configured for NestJS API (`apps/api`) and Next.js Admin Dashboard (`apps/admin-dashboard`).
- Sentry unhandled exception logger filter registered globally in API backend.
- Nginx reverse proxy gateway configurations (`nginx/nginx.conf`) mapped to proxy restful paths, Swagger endpoints, and Socket.io WebSocket channels on port 80 cleanly.
- Git: repo at **github.com/YousefNijim/shu-abalak** (private). Lots of **uncommitted work** since the initial commit (admin pages, all mobile screens, port changes).

---

## 👉 Next steps (suggested order)

1. ~~**API auth module**~~ ✅ DONE.
2. ~~**API orders + businesses + products modules**~~ ✅ DONE (+ areas).
3. ~~**Drivers module**~~ ✅ DONE — full order lifecycle (PENDING→DELIVERED) now works end-to-end.
4. ~~**Payments module**~~ ✅ DONE — cash settles on delivery; online infra ready behind `PaymentProvider` (mock today). To enable real online payments: implement `PaymentProvider` for a gateway + rebind `PAYMENT_PROVIDER` in `PaymentsModule`.
5. ~~**Reviews + Users modules**~~ ✅ DONE — all domain modules complete.
6. ~~**Socket.io gateway**~~ ✅ **100% DONE** — WebSockets gateway server and client hook listeners implemented for instant live updates.
7. ~~**Wire frontends to the API**~~ ✅ **100% DONE** — All 4 frontends (Admin Dashboard, Customer App, Business App, and Driver App) are fully wired, authenticated, typecheck clean, and successfully linked to the live API!
8. ~~**DevOps & Infra (Phase 7)**~~ ✅ **100% DONE** — GitHub Actions CI pipeline, multi-stage Dockerfiles for NestJS and Next.js, Sentry incident capturer filters, and Nginx reverse proxy gateway configurations mapped and validated.
9. ~~**Feature Leftovers & Polish (Phase 8)**~~ ✅ **100% DONE** — Local/S3 Uploads REST module registered, SMS & Push alert interfaces injected, supertest E2E integration specs running, and atomic driver availability automation toggles configured.
10. ~~**UI Polish (Phase 11 — branch `feat/ui-polish`)**~~ ✅ **100% DONE** — Cairo font loaded in all 3 app layouts (blocks splash until ready); `fontFamily` tokens added to `tokens.ts`; Button upgraded with Reanimated scale press animation; Input/Card polished; Lucide icons replace emoji tabs in all 3 apps; Register screen upgraded with `@gorhom/bottom-sheet` area picker; all screens use `fontFamily.*` tokens instead of raw `fontWeight` strings; `tsc --noEmit` clean on customer-app, business-app, driver-app.
11. ~~**Home Screen Redesign (Phase 12 — branch `feat/ui-polish`)**~~ ✅ **DONE** — Full redesign of customer-app Home: Lucide icons (UtensilsCrossed/Store/Coffee) in colored circles replace emoji categories; expo-image for business card images with branded placeholder; expo-linear-gradient banner (#E6781E→#C96016) with decorative icon and CTA; real rating pill (star + score), Clock+Bike meta icons, open/closed badge on image with gradient overlay; search bar with filter button and shadow; bottom nav safe-area-aware (height = 64 + insets.bottom); FAB anchored above nav, clears card content. Button.tsx fixed for reanimated v4 (Animated.View wrapper instead of createAnimatedComponent(Pressable)). `components`/`shadows` added to customer-app `src/theme.ts` re-exports. Gotcha: `Animated.createAnimatedComponent(Pressable)` type-errors in reanimated v4 — wrap Pressable in `Animated.View` instead.
12. ~~**Profile Pages & Core UI Updates (Phase 13)**~~ ✅ **DONE** — Hand-crafted pixel-perfect React Native implementations of 4 missing Profile screens (Saved Addresses, Notifications, Change Password, About Us) for Customer App.
13. ~~**Stitch Designs Port (Phase 14)**~~ ✅ **DONE** — Fully ported all Customer App screens, as well as Business and Driver App Splash/Auth screens, to perfectly match the Google Stitch UI/UX design zip exports.
14. ~~**Application Flow & Logic Fixes (Phase 15)**~~ ✅ **DONE** — Addressed logic flow issues: Fixed math floating-point/concatenation bugs in Customer Cart total, Business total sales, and Driver earnings. Fixed Customer App Logout button clickability by untrapping ScrollView events and applying `TouchableOpacity`. Synchronized WebSocket `order:status_update` listeners across Customer tracking screen. Enhanced Order History logs to explicitly display all inner items and quantities. Verified Driver Request assign/accept/reject end-to-end flows.
19. ~~**Driver status update reliability + mis-tap guard (Phase 20 — branch `feat/ux-fixes`)**~~ ✅ **DONE** — Fixed driver active-delivery screen and business order-detail screen:
    - **Root cause (driver):** Steps 0→1 ("استلمت الطلب" / "وصلت لموقع الزبون") were pure `setStep()` calls with no API call and no double-tap guard. A double-tap advanced `step` by 2 in a single render cycle, skipping straight to the delivery confirm. Only the final DELIVERED mutation actually called the API — intermediate steps are UX-only (correct, since `PICKED_UP → DELIVERED` is the only valid API transition for drivers).
    - **Root cause (business):** PENDING state exposed two simultaneous buttons (reject + confirm). A double-tap could fire both `CANCELLED` and `CONFIRMED` before `isPending` flipped in the next render.
    - **Fix A — ref guard:** Added `advancing` / `submitting` `useRef(false)` booleans. Handler checks and sets the ref synchronously before any async work; released in `onSuccess`/`onError`. Blocks second tap even if React hasn't re-rendered yet.
    - **Fix B — render guard:** All footer buttons are `disabled={isPending}` so the UI also blocks taps visually once the mutation is in flight.
    - **Fix C — single-button footer:** Driver footer now renders `{step === 0 && ...} {step === 1 && ...} {step === 2 && ...}` — only ONE button is ever in the DOM at a time, making it impossible to see two actionable buttons simultaneously.
    - **Fix D — loading overlay:** Both screens show a `<Modal>` fullscreen dimmed overlay with `ActivityIndicator` + Arabic label while the mutation is pending. Blocks all underlying touch interaction during network flight.
    - **Verified:** `tsc --noEmit` on driver-app + business-app ✅ (errors are all pre-existing in unchanged files). `nest build` ✅ clean.
18. ~~**Delivery Address Flow (Phase 19 — branch `feat/ux-fixes`)**~~ ✅ **DONE** — Selected delivery address flows end-to-end from saved addresses → order → all three apps:
    - **Area required:** Saved-address form now requires area selection. Inline errors (`الرجاء اختيار المنطقة`, etc.) shown per-field without `Alert.alert`. "Clear area" option removed from picker. `FormErrors` type wired to `setFormErrors` with live clearing on field change.
    - **DB snapshot:** `deliveryAreaName String?` + `deliveryAddressDetail String?` added to `Order` model. Migration `20260530000003_order_delivery_address` applied. These are snapshot fields — preserved even if the user later edits/deletes their saved address.
    - **API:** `CreateOrderDto` accepts both new fields (optional, validated). `orders.service.ts` persists them on `order.create`. `DriverRequestPayload` in `shared-types` + `socket.gateway.ts` extended with `addressDetail?`. Both `sendDriverRequest` and `updateStatus` PICKED_UP paths send the snapshot address in the socket payload.
    - **api-client:** `Order` type gains `deliveryAreaName` + `deliveryAddressDetail`. `CreateOrderDto` gains both fields.
    - **Cart:** Queries `addressesApi.list()` for full address objects (with area name). `handleConfirm` passes `deliveryAreaName` (`city — name`) + `deliveryAddressDetail` (address text) into `createOrder`. Falls back to cart's `areaId` if no saved address selected.
    - **Business order detail:** Replaces `customer.area.name` proxy with `deliveryAreaName` + `deliveryAddressDetail` in a dedicated "عنوان التوصيل" card. Only shown when data exists.
    - **Driver request-alert:** Receives `addressDetail` from socket params. Shows "عنوان التوصيل" block with `areaName` (Bold) + `addressDetail` (muted) + `MapPin` icon.
    - **Driver active-delivery:** Customer card now shows `order.deliveryAreaName` + `order.deliveryAddressDetail` in a branded orange-tinted block labeled "عنوان التوصيل". Falls back to `customer.area.name` if no snapshot exists (backward compat with old orders).
    - **Customer tracking:** "عنوان التوصيل" card inserted above order summary. Shows `deliveryAreaName` (Bold) + `deliveryAddressDetail` (muted) with `MapPin` icon in a white card with border.
    - **Verified:** `nest build` ✅, `tsc --noEmit` on customer/business/driver ✅ — no new errors in changed files.
17. ~~**Saved Addresses CRUD (Phase 18 — branch `feat/ux-fixes`)**~~ ✅ **DONE** — Full end-to-end addresses CRUD for customer app:
    - **DB:** New `SavedAddress` model in Prisma (`id, userId, label, detail, areaId?, createdAt`). Migration `20260530000002_saved_addresses` applied. `User` + `Area` got `savedAddresses[]` relations.
    - **API:** New `addresses` NestJS module. `GET /addresses/me` (list own), `POST /addresses` (create), `PATCH /addresses/:id` (update, ownership-checked), `DELETE /addresses/:id` (delete, ownership-checked). All guarded by `JwtAuthGuard`. Registered in `app.module.ts`. Visible in Swagger at `/docs`.
    - **api-client:** `addressesApi` added to `packages/api-client` with `SavedAddress` type and `CreateAddressDtoClient` / `UpdateAddressDtoClient` exports.
    - **Screen (`addresses.tsx`):** Fully rewritten — React Query for list/mutations, slide-up modal for add/edit (label + detail + area picker), delete with `Alert.alert` confirm, loading/empty/error states, `ActivityIndicator` per button while in-flight, all buttons disabled during mutations. Area picker uses same row/check/tint style as Home/Cart selector.
    - **Store sync:** On create → pushes to `useSavedAddressesStore`; on delete → removes matching entry from store so Home/Cart picker stays in sync.
    - **Gotchas:** DTO fields need `!` (definite assignment) for `strictPropertyInitialization` — NestJS standard. `prisma generate` requires stopping any node holding port 3001 first (DLL lock on Windows).
    - **Verified:** `nest build` ✅ clean. `tsc --noEmit` on customer-app ✅ no new errors in changed files.
    - **Operations:** List ✅ / Add ✅ / Edit ✅ / Delete ✅ — all wired to real API endpoints.
16. ~~**Address Selector Redesign (Phase 17 — branch `feat/ux-fixes`)**~~ ✅ **DONE** — Customer app address selector now shows saved addresses instead of delivery zones:
    - **New store:** `src/stores/saved-addresses.store.ts` — Zustand persist (AsyncStorage), `SavedAddress { id, label, detail, areaId }`, `add/remove/select` actions.
    - **Home address bar:** Compact two-line row (muted "التوصيل إلى" label + bold address name + MapPin icon in orange circle + ChevronDown). Taps open the bottom sheet.
    - **Home + Cart bottom sheet:** Title "اختر عنوان التوصيل". Address rows: soft-circle icon (HomeIcon) + bold label + muted detail line + Check on active. Active row: light orange tint + orange border. Empty state (no saved addresses): MapPin + Arabic message + hint. Footer button "إضافة عنوان جديد" (+ icon, orange) routes to `/profile/addresses`.
    - **Both screens** source from `useSavedAddressesStore` — removed all `areasApi` imports from Home and Cart.
    - **Businesses query** still passes `selectedAddress?.areaId` for delivery-fee filtering.
    - **Gotchas:** `colors.white` and `CartItem.imageUrl` errors in cart.tsx/index.tsx are pre-existing (not introduced by this task).
15. ~~**UX/Logic Fixes Batch (Phase 16 — branch `feat/ux-fixes`)**~~ ✅ **DONE** — 9 fixes across all 3 mobile apps:
    - **Fix 5 (API+Business+Driver):** Driver assignment now waits for acceptance. New endpoints `POST /orders/:id/send-driver-request` (emits socket, stores `pendingDriverId`, order stays READY) and `POST /orders/:id/accept-driver` (driver does READY→PICKED_UP). Business driver-selection shows pending spinner; rejects return to picker with alert. Schema migration `20260530000001_order_pending_driver` adds `pendingDriverId` to orders.
    - **Fix 6 (Driver):** `request-alert` screen always dismisses after accept or reject — `settled` ref prevents double-action.
    - **Fix 7 (Business+Driver):** All API-hitting status buttons show loading labels + are disabled while in-flight. Destructive actions (CANCELLED, DELIVERED) require Alert confirmation.
    - **Fix 8 (Driver):** Revenue reduce now coerces `deliveryFee` (Prisma Decimal → string) with `Number()`. Total displayed via `formatShekel`.
    - **Fix 9 (Business):** Analytics chart now uses `periodOrders` not raw `orders`; chart buckets adapt (hourly for today, daily for week/month).
    - **Fix 1 (Customer):** Zustand `active-order.store` persists current order; Cart sets it, Tracking syncs/clears it. Home shows a green banner (business name + Arabic status) tapping into tracking.
    - **Fix 2 (Customer):** `RefreshControl` on Home ScrollView (brand orange tint) re-fetches businesses on pull.
    - **Fix 3 (Customer):** Business detail product cards show inline `+/-` stepper when item is in cart; collapses to `+` at 0.
    - **Fix 4 (Customer):** Address selector strip (MapPin + area name) on Home and Cart; slide-up Modal lists all areas with active one highlighted.
    - **Gotchas:** Prisma `pendingDriverId` field needed `migrate deploy` + `prisma generate` before TS picked it up. `Button variant="outline"` doesn't exist — use `secondary`. `compileWeeklyChart` was always using raw `orders` regardless of period selector.

---

20. ~~**Business-App Profile Rebuild + Functionality Audit (Phase 22 — branch `YOUSEF`)**~~ ✅ **DONE** — Rebuilt the business Profile/Account screen ("الحساب الشخصي") to faithfully match the Stitch design (`.design-refs/driver profile and  usiness profile and menu/_4`):
    - **New screen layout:** header (back-arrow → logout, title in primary), hero **cover image** with "تغيير الغلاف" overlay button, circular **logo** with camera button, "المعلومات الأساسية" card (store name + category select), "الموقع والعنوان" card (detailed address + decorative map preview), "إعدادات إضافية" list card (working-hours row → time-range modal, phone row → phone modal), sticky **"حفظ التغييرات"** FAB (loading/disabled/success states), and a working **"تسجيل الخروج"** link. All RTL, Cairo, lucide icons, brand tokens, soft shadows + rounded cards.
    - **Cover vs logo:** `imageUrl` = cover (already the customer hero), new `logoUrl` = circular logo. Both upload via the existing `POST /uploads/image` endpoint (`src/lib/upload.ts`).
    - **Schema:** `Business` gained `logoUrl`, `addressDetail`, `lat`, `lng`, `openTime`, `closeTime` (migration `20260530200000_business_profile_fields`, applied via the diff→deploy→generate flow). `lat`/`lng` columns exist but are **unused** — per product decision the location section is **address-based only** (no GPS/maps libs; matches the app's region model). The map is a decorative styled preview, not real tiles.
    - **Working hours:** simple time-range modal (hour/minute/ص-م segmented pickers) → `openTime`/`closeTime` strings.
    - **DTO + api-client:** `CreateBusinessDto` (→ `UpdateBusinessDto` via PartialType) + `Business` type gained `logoUrl`/`addressDetail`/`openTime`/`closeTime`.
    - **Customer reflection:** customer `business/[id]` hero now resolves relative `/uploads/...` paths via `BASE_URL` (`mediaUrl` helper — fixes latent broken-image bug for any uploaded cover) and surfaces `addressDetail` + `openTime–closeTime` under the business name.
    - **Logout:** wired to `useAuthStore.logout()` (clears token + axios header + profile) with a confirm Alert — verified it fires (both the header arrow and the bottom link).
    - **Audit (all ✅, wired to live API):** Dashboard (open/close toggle `businessesApi.update`, live order stats, status sections, card→order detail nav); Orders/Order-detail (status mutations PENDING→CONFIRMED→PREPARING→READY, reject→CANCELLED, double-tap guards from Phase 20); Driver-selection (`driversApi.available` + `ordersApi.sendDriverRequest`, pending/reject handling); Menu (products CRUD + availability toggle + image upload, all `productsApi`); Analytics (live `ordersApi.list` aggregates, period buckets); Profile (this rebuild). **No dead buttons** — every onPress navigates, toggles state, or fires an API mutation.
    - **Verified:** `nest build` ✅ clean; `tsc --noEmit` on business-app ✅ (only the pre-existing `ui-components/native/Input.tsx` overload error remains, unmodified); customer-app `tsc --noEmit` unchanged at 42 pre-existing errors (none in `business/[id].tsx`). **E2E against live API:** registered a throwaway BUSINESS user → created a business → `PATCH /businesses/:id` with name/category/addressDetail/openTime/closeTime/phone/logoUrl/imageUrl persisted → `GET /businesses/:id` (customer path) returned all of them → cleaned up the test records.

21. ~~**Store Registration / Approval / Password Management (Phase 23 — branch `YOUSEF`)**~~ ✅ **DONE** — End-to-end store onboarding + password lifecycle, reusing the existing User/Business entities (no parallel models):
    - **Audit finding:** the previously-claimed "admin approves/rejects registrations" did **not** exist — the admin businesses page only had open/close + commission. There was no business approval state, no admin store-create, and no password endpoints. The fake customer `change-password.tsx` only showed an Alert.
    - **Model:** added `PENDING` to `UserStatus` (Prisma + `@shu/shared-types`) and made `User.password` **nullable** (migration `20260530210000_user_pending_status_nullable_password`). "Pending vs active" continues to ride on `User.status` — login already blocks non-ACTIVE users, so a pending store naturally can't log in. No `isApproved`/second model.
    - **API (`auth`):** `POST /auth/register-business` (public) creates a BUSINESS owner in `PENDING` with `password: null` + the linked `Business` in one transaction (`RegisterBusinessDto` reuses Business field names: name/category/ownerName/phone/areaId/addressDetail). `PATCH /auth/change-password` (JWT) verifies current password then updates. `login` now guards null passwords and returns a "قيد المراجعة" message for PENDING.
    - **API (`businesses`, ADMIN):** `POST /businesses/admin` (full store, owner ACTIVE + password, immediately log-in-able), `PATCH /businesses/:id/approve` (set first password + PENDING→ACTIVE), `DELETE /businesses/:id/reject` (deletes a still-pending registration + owner), `PATCH /businesses/:id/password` (reset). `findAll` now includes `owner {id,name,phone,status}` so the admin grid can show approval state (never the hash).
    - **api-client:** `authApi.registerBusiness/changePassword`, `businessesApi.adminCreate/adminApprove/adminReject/adminResetPassword`; `Business.owner` + `AdminCreateBusinessDto`/`RegisterBusinessDto`/`ChangePasswordDto` types exported.
    - **Business-app login fix (Part A):** rebuilt the phone field as a single RTL row `[Phone icon] [970+ prefix] [number LTR]` — eliminates the prefix/number overlap and mixed-direction bug. Forgot-password + support buttons now functional (show a support/reset-contact message; web-safe via `window.alert` fallback). Added "سجّل متجرك الجديد" link.
    - **Business-app (Parts B/D):** new `(auth)/register.tsx` store-registration form (reuses Business fields, inline category/area pickers, RTL, brand tokens) → `registerBusiness` → pending-confirmation screen. New `change-password.tsx` wired to `authApi.changePassword`, linked from the profile "إعدادات إضافية" list.
    - **Admin dashboard (Part C):** businesses page gained an "حالة الاعتماد" column (PENDING/معتمد/معلّق/محظور), per-row **موافقة/رفض** buttons for pending stores + a **key** reset-password button for active ones, a PENDING status filter, and an **"إضافة متجر جديد"** modal (create full store + password, immediate activation). Password/reject/create modals with toasts.
    - **Verified:** `nest build` ✅; admin `tsc --noEmit` ✅ clean; business-app `tsc` ✅ (only the pre-existing `ui-components/native/Input.tsx` error); customer-app unchanged at 42 pre-existing errors. **Live-API E2E (9/9):** self-register→PENDING; pending login→401; admin sees PENDING; approve+password→ACTIVE; store login→ok; admin-create→immediate login ok; reset password→old 401/new ok; owner change-password→wrong-current 401/new login ok. Test records cleaned up afterward.

22. ~~**Two-Section Restructure — BusinessType (FOOD/STORE) + multi-value Tags (Phase 24 — branch `YOUSEF`)**~~ ✅ **DONE** — Split the flat `BusinessCategory` into a top-level **section type** + many-to-many **tags**, propagated everywhere, ordering preserved.
    - **Model (migration `20260531000000_business_type_and_tags`):** new enum `BusinessType { FOOD, STORE }`; **`Business.category` → `Business.type`** (`@default(FOOD)`); new **`Tag` model** (`id, name, type`, unique `[name,type]`) + M2M `Business.tags ↔ _BusinessTags`. Dropped old `BusinessCategory` enum + `category` column. **Data-preserving:** existing rows backfilled to `FOOD`; 13 predefined tags seeded *inside the migration* (9 FOOD: شرقي/غربي/شاورما/فلافل/بيتزا/مشاوي/إفطار/كافيه/حلويات, 4 STORE: سوبرماركت/ماركت صغير/خضار وفواكه/ملحمة). **`Product.category` (free-text menu sections) is UNTOUCHED — different field.**
    - **Migration gotcha:** `set` is invalid on a Prisma `create` (use `connect` on create, `set` on update). The IDE shows stale-Prisma-client red after a schema change until the TS server reloads; `nest build` uses the regenerated client and is the source of truth.
    - **Backend:** new **TagsModule** (`GET /tags?type=` public). Businesses `findAll` filters by `type` + `tagId`, includes `tags`; `create`/`update`/`adminUpdate`/`adminCreate` + `auth.registerBusiness` take `type` + `tagIds[]` (helpers `tagConnect`/`tagSet`). DTOs swapped `category`→`type`+`tagIds`. shared-types: `BusinessType` + `Tag`. seed auto-tags the two demo businesses (مطعم القدس→شرقي/شاورما, كافيه الصباح→كافيه/حلويات), both FOOD.
    - **api-client:** `Business.type`+`tags`, `tagsApi`, `BusinessType`/`Tag`/`BusinessWriteDto` types, `BusinessListParams.{type,tagId}`, register/admin-create DTOs.
    - **Customer app — NEW ENTRY POINT:** `app/sections.tsx` section picker (two gradient cards: المطاعم→FOOD Home, المتاجر→placeholder). Splash + login + OTP now route to `/sections`. Home (`(tabs)/index.tsx`) is **FOOD-only** with **tag chips fetched from the API** (multi-tag businesses appear under each tag); a LayoutGrid header button switches sections. `app/stores-coming-soon.tsx` = "قريباً" placeholder (back-navigable, `type=STORE` wired for later). `business/[id].tsx` shows tag pills + uses `type` for the hero icon.
    - **Propagation:** business-app **registration** + **profile edit** = type segmented control + type-specific tag multi-select. Admin businesses page = type+tags column, type filter, create modal (type select + tag chips), **new edit modal** (type/tags via `adminUpdate`), detail drawer shows type + tags.
    - **Token fix:** added `white: '#FFFFFF'` to `ui-components/tokens.ts` (cleared ~20 pre-existing `colors.white` TS errors across customer-app).
    - **Verified:** `nest build` ✅, admin `next build` ✅ (13 routes), admin `tsc` ✅, business-app `tsc` ✅ (only pre-existing Input.tsx), customer-app 42→**21** errors (all pre-existing noise; the change *removed* 21, added 0 net). **Migration applied + seed loaded with tags.** **Live-API E2E:** (a) full order lifecycle PENDING→DELIVERED still works on a FOOD business; (b) `GET /tags?type=FOOD|STORE`, `/businesses?type=`, `/businesses?tagId=` all correct; (c) admin-create STORE+tag → appears under type=STORE + filterable by tag. Test records cleaned up.
    - **Gotcha for next agent:** the seed's `upsertUser` does NOT re-hash passwords on update (no-op), so once a password is changed via the admin/owner endpoints, re-seeding won't reset it — reset via `PATCH /businesses/:id/password` if needed. Seed business logins: `0599000002`/`0599000004` = `test1234` (unless changed since).

23. **Business App Splash & Onboarding (Phase 25)** ✅ **DONE** — Added a Splash/Welcome screen and an Onboarding screen at the START of the business-app:
    - **Splash (`app/index.tsx`):** Cream background, centered "شو عبالك؟" logo, subtitle "تطبيق المنشأة التجارية", PREMIUM HOSPITALITY label, and Lucide icons (Utensils, Truck, Store). Auto-redirects to onboarding on first launch, else dashboard/login.
    - **Onboarding (`app/onboarding.tsx`):** Mirroring the structure of the customer app onboarding, created a Carousel format. Slide 1 features the chef/owner image with "+24% مبيعات" and "طلب جديد" stat chips overlaid, using the brand tokens. "تخطي" skips to login, persisting `businessOnboardingSeen` flag in `auth.store.ts`.
    - **Wiring:** Modified `auth.store.ts` to include `businessOnboardingSeen: boolean` synced via AsyncStorage. Modified Splash to properly redirect based on this new flag.
    - **Verified:** `tsc --noEmit` on business-app ✅ (only the pre-existing `Input.tsx` overload error remains).

24. **Dynamic Home Screen & Admin Control (Phase 26)** ✅ **DONE** — Added dynamic banner slider and category image management from Admin Dashboard:
    - **Database/API:** Created new `Banner` model and added `imageUrl` to `Tag`. Implemented `BannersModule` for full CRUD, and added CRUD + image upload capabilities to `TagsModule`. Updated `@shu/api-client` accordingly.
    - **Admin Dashboard:** Created `/banners` page to upload, toggle visibility, and delete promotional slider images. Created `/tags` page to manage categories, their types (FOOD/STORE), and upload custom icons. Added shortcuts to the Sidebar.
    - **Customer App:** Replaced the static promo box with a dynamic, auto-playing image slider (`ScrollView` with `pagingEnabled`) fetching active banners from the API. Updated category tag rendering to use the dynamic `imageUrl` from the backend instead of static local images. Increased `paddingTop` of the home screen to add more spacing from the top bar.

25. **Push Notifications / FCM (Phase 27)** ✅ **DONE** — Real FCM push end-to-end across backend + 3 mobile apps, **additive to the existing sockets** (both fire). Full setup in [NOTIFICATIONS_SETUP.md](./NOTIFICATIONS_SETUP.md).
    - **Audit:** the old `common/providers/push.service.ts` was a dead log-only stub (never imported/called); `firebase-admin` was not installed; no token table, no endpoints, no `expo-notifications`. Genuinely "not started" — built fresh.
    - **Schema:** new `DeviceToken` model (`userId, token unique, platform?, app?`) + `User.deviceTokens[]`. Migration `20260531120000_device_tokens` applied via the diff→deploy→generate flow (stopped the node holding :3001 first to avoid the Prisma DLL lock).
    - **Backend:** `NotificationsModule` (`@Global`) using `firebase-admin`. Credential loaded from `FIREBASE_SERVICE_ACCOUNT_PATH` (default `./secrets/firebase-service-account.json`) — **never hardcoded**; if missing, API still boots and pushes are skipped ("FCM disabled"). `NotificationsService.send(userId, {title,body,data})` looks up tokens, sends an FCM multicast, never throws, and **auto-prunes stale/invalid tokens**. Endpoints: `POST /notifications/register-token`, `DELETE /notifications/token` (both JWT).
    - **Triggers (in `OrdersService`, alongside socket emits):** order create → business ("طلب جديد"); status changes → customer ("تم تأكيد طلبك" / "جاري التحضير" / "طلبك في الطريق" / "تم التسليم" …); driver request (dispatch + PICKED_UP) → driver ("طلب توصيل جديد"). Every push carries `data:{type,orderId,role}` for deep-linking.
    - **api-client:** `notificationsApi.registerToken/unregisterToken` + `RegisterTokenDto`.
    - **Mobile (all 3 apps):** installed `expo-notifications` + `expo-device` + `expo-constants` (Expo SDK **54**). Added the `expo-notifications` config plugin + `googleServicesFile` to each `app.json`, and **fixed the Android package names from `com.shu.*` → `com.shoabalak.*`** to match the registered Firebase apps / `google-services.json`. Each app has `src/hooks/usePushNotifications.ts`: requests permission, gets the **native FCM device token** (`getDevicePushTokenAsync` — no EAS projectId needed since sending is server-side), registers it on login / unregisters on logout, shows foreground notifications, and deep-links on tap (customer→tracking, business→order/[id], driver→request-alert). Hook mounted via a `PushNotificationsBridge` in each `_layout.tsx` (driver folds it into the existing `GlobalSocketListener`).
    - **Customer notifications screen:** rewired from hardcoded mock cards to a real `notifications.store` (Zustand+persist) — shows received pushes, mark-all-read, empty state. This also **removed the pre-existing `colors.info`/`success`/`warning` tsc errors** in that file.
    - **Files (gitignored):** service-account key → `apps/api/secrets/firebase-service-account.json`; `google-services.json` → each app root. `.gitignore` updated. Renamed the mis-named `business-app/google-services (1).json` → `google-services.json`.
    - **Verified:** ✅ `firebase-admin` init with the real `shoabalak` key + live FCM send reachable (bogus token → `invalid-argument`, proving auth). ✅ Live-DB E2E: token upsert (idempotent), `send()` lookup+dispatch, stale-prune, cleanup. ✅ `tsc --noEmit` on all 3 apps — **zero new errors** in any touched file (only pre-existing noise remains). ⚠️ `nest build` blocked by **pre-existing** errors in `banners.controller.ts`/`tags.controller.ts` (`strictPropertyInitialization` on inline DTOs — fail identically without my changes); the notifications code itself compiles clean.
    - **Gotcha for next agent:** real device delivery needs a **native dev build** (Expo Go ignores `google-services.json`) on a **physical device**. Verify each app's `google-services.json` `package_name` matches its `android.package` — the **driver app's file currently contains `com.shoabalak.business`** (wrong copy) and must be re-downloaded from Firebase before driver push works.

26. **Customer-app Fixes — Group (a): Header/Nav + Safe-areas + Icons/Names (Phase 28 — branch `Yousef2`)** ✅ **DONE** — first of four fix groups; usability + branding pass across the customer app:
    - **Notifications bell now functional everywhere (item 1):** new shared `src/components/NotificationBell.tsx` (Bell + unread badge) wired into the section-landing header, Home header, and Profile header. Tapping opens the existing in-app notifications screen (`/profile/notifications`, backed by `notifications.store`). Badge shows the live unread count (red dot/`9+`) and re-renders as notifications arrive. Background/cold-start FCM notifications are now also **recorded into the in-app list** (previously only foreground): `usePushNotifications` records on the tap + cold-start handlers too, deduped by FCM request identifier (+ a 10s identical-content guard) in the store.
    - **Account icon on the section landing (item 2):** added a profile/account icon to the top-LEFT of the section-picker header (next to the logo). Taps `router.push('/(tabs)/profile')` — opens the customer account screen directly without entering a section first.
    - **Cart in bottom tab bar (item 3):** confirmed already implemented — السلة tab in `(tabs)/_layout.tsx` with item-count badge (no floating button). No change needed.
    - **Safe areas (item 4):** switched the platform-hardcoded `Platform.OS === 'ios' ? insets.top : <fixed>` headers to `insets.top + spacing` on **all** platforms (Home, Profile, Cart, Product) so the top bar clears the Android status bar too; removed the conflicting fixed header heights. **Product page:** top bar gets a faint semi-transparent cream tint (`rgba(252,243,220,0.55)`) so it stays legible over the hero without hiding it; the sticky add-to-cart footer is lifted above the gesture/nav bar via `Math.max(insets.bottom, spacing[3]) + spacing[2]` and the scroll bottom-padding accounts for it.
    - **Profile duplicate top bar (item 7):** the "حسابي"-only bar was the **Tabs navigator header** — set `headerShown: false` on the profile tab. Kept the main bar (logo + bell + avatar) and added the centered title **"الحساب الشخصي"**.
    - **Cart duplicate bar + mandatory address (item 5, started here):** the cart's second bar was the **Stack header** (`title: 'سلّتك'`) — set `headerShown: false` for `cart`, leaving the single clean custom header. Delivery address is now enforced **inline**: if none selected, `handleConfirm` blocks submission, flags the address bar red with an inline error ("الرجاء اختيار عنوان التوصيل لإتمام الطلب"), and opens the address picker (replaced the old `Alert`). Error clears on selection.
    - **App icons + names (item 9):** generated 1024×1024 `icon.png` + `adaptive-icon.png` for each app from `.design-refs/*app icon.png` (centered on cream `#FCF3DC`, 78% safe-zone, via `jimp-compact`). Updated each `app.config.js`: customer `icon` → real icon + `adaptiveIcon.foregroundImage`; names set to **شو عبالك** (customer), **تاجر شو عبالك** (business), **كابتن شو عبالك** (driver); added `adaptiveIcon.foregroundImage` to business + driver.
    - **Verified:** `tsc --noEmit` on customer-app ✅ **0 errors** (down from ~21 pre-existing). Device screenshots not produced — no emulator/device available from this environment (per Key facts).
    - **Next:** group (b) cart [remaining item 5 polish], group (c) notifications + order-status transitions [item 6], group (d) edit-profile [item 8].

27. **Customer-app Fixes — Group (c): Order-status notifications + cancellation handling (Phase 29 — branch `Yousef2`)** ✅ **DONE** — item 6.
    - **Backend already complete (verified, no change):** `OrdersService` pushes a customer FCM notification on **every** transition via `pushOrderStatusToCustomer` (called from `updateStatus`, `acceptDriver`, and admin `adminIntervention`). `STATUS_PUSH_BODY` covers CONFIRMED/PREPARING/READY/PICKED_UP/DELIVERED **and CANCELLED** ("تم إلغاء طلبك"). Every push carries `data:{type:'order_status',orderId,status,role}`, and the device records it into the in-app list (group a) so it also appears on the notifications page. Socket `order:status_update` fires alongside each push. Business-cancel and customer-cancel (PENDING-only) both route through `updateStatus` → push.
    - **Client gap fixed (the real work):** active-order card on Home was only cleared by `tracking.tsx`'s effect — so a cancellation pushed while the user was NOT on the tracking screen left a stale "active order" banner. Added `src/hooks/useGlobalOrderSync.ts`, mounted app-wide via an `OrderSyncBridge` in `_layout.tsx`: it listens to `order:status_update` regardless of the current screen, invalidates `['orders']` + `['order',id]`, and — when the change is for the stored active order — **clears the active-order card on terminal status (DELIVERED/CANCELLED)** or syncs its status otherwise.
    - **Past orders (verified, no change):** `(tabs)/orders.tsx` already buckets CANCELLED into "السابقة" with a red "ملغى" badge; once the global listener refetches, a cancelled order leaves "الحالية" and lands in "السابقة" automatically.
    - **Incidental (group-a consistency):** fixed the remaining platform-hardcoded safe-area headers on `orders.tsx` + `tracking.tsx` (now `insets.top` on all platforms, removed fixed iOS heights) and replaced the inert bell on the Orders header with the shared `NotificationBell`.
    - **Verified:** `tsc --noEmit` on customer-app ✅ 0 errors. Device test pending (no emulator here).
    - **Remaining:** group (d) — edit-profile (item 8).

28. **Customer-app Fixes — Group (d): Edit Profile (Phase 30 — branch `Yousef2`)** ✅ **DONE** — item 8; the customer can now fully edit their profile, all persisted to the API.
    - **Schema:** added `User.imageUrl String?` (migration `20260601000000_user_image_url`, applied via deploy→generate; `email` already existed unique-optional). Started Docker Postgres for the migration; stopped API + Postgres afterward to release the Prisma DLL lock.
    - **API (`auth`):** `GET /auth/me` now returns the **full** profile (`email`+`imageUrl`, via new `AuthService.getMe` — JWT payload alone omitted them). New `PATCH /auth/profile` (JWT) updates name/email/imageUrl, and **phone only with a verified OTP**: the DTO carries `phone`+`otpCode`, and the service re-verifies the code server-side (`verifyOtp`) so it can't be bypassed; email + phone uniqueness enforced with friendly Arabic conflicts; `publicUser()` never leaks the hash. Reuses the existing `POST /uploads/image` for the photo (no new upload endpoint needed).
    - **api-client:** `authApi.updateProfile` + `AuthUserProfile` type; `me()` now typed to the richer shape; `otpRequest`/`otpVerify` typed (`devCode`, `verified`).
    - **Customer app:** added `expo-image-picker@~17.0.11` (+ config plugin with Arabic photos-permission string) and copied the RN-safe `src/lib/upload.ts` (web blob vs native `{uri,name,type}` FormData). New **`app/profile/edit.tsx`**: avatar with camera button (pick → upload → preview), name, email, and phone fields; when the phone changes, a **"يجب التحقق من الرقم الجديد"** box appears — "إرسال رمز التحقق" → 4-digit OTP input → "تأكيد الرمز"; save is blocked until verified. Sticky safe-area save button; success/error feedback; no dead buttons. Auth store gained `email`/`imageUrl`, `refreshUser()` (re-pulls `/auth/me`), and `setUser()`.
    - **Profile screen wiring:** the "تعديل الملف الشخصي" button and the avatar pencil now route to `/profile/edit` (were "coming soon"); the screen `refreshUser()`s on focus and resolves the stored `imageUrl` path through `BASE_URL`.
    - **Verified:** `nest build` ✅ (also cleared the previously-noted banners/tags pre-existing errors — they were collateral of unbuilt `@shu/shared-types`, now built). `tsc --noEmit` customer-app ✅ 0 errors. **Live-API E2E (all pass):** `GET /me` shows email/imageUrl; PATCH name+email (email lowercased) + imageUrl persists; phone change **without** OTP → 400, **wrong** OTP → 400, **correct** `0000` → 200 and phone updated; test user cleaned up.
    - **Note:** OTP is still the dev stub (fixed code `0000`, no SMS provider) — the verification *flow* is fully wired end-to-end; swapping in a real SMS gateway is a backend-only change to `requestOtp`/`verifyOtp`.
    - **All four fix groups (a/b/c/d) for this round are complete.** Device screenshots still pending (no emulator in this environment).

33. **RTL fix — #1 of BUG_AUDIT.md (Phase 35 — branch `Yousef2`)** ✅ **DONE — ⚠️ device testing required**
    - **Root cause:** Commit `47c24535` (Phase 26, 2026-05-31) accidentally replaced `forceRTL(true)` with `forceRTL(false)` in all three `_layout.tsx` files as collateral damage in a 25-file feature commit. No comment, no rationale — confirmed accidental regression, not a deliberate workaround.
    - **Fix:** Restored `I18nManager.allowRTL(true); I18nManager.forceRTL(true);` at module level (before component mount) in all three apps: customer, business, driver.
    - **Layout scan:** All 93+ StyleSheet entries already use explicit `flexDirection:'row-reverse'` / `textAlign:'right'` — none depend on the OS RTL direction. The only absolute-position items affected were the `NotificationBell` unread badge in all three apps: `left: -2` → `right: -2` (badge at top-right of icon, universal convention). Decorative blobs in driver splash flip sides under RTL — visually neutral.
    - **⚠️ Device testing required:** `forceRTL` takes effect on the NEXT full app launch. Kill app → relaunch on a real device. Check: text inputs (phone/OTP/search), native pickers, ScrollView swipe direction, bottom tab order, modal presentation on Android.
    - **tsc:** customer ✅ 0 | business ✅ 0 | driver ✅ 0.

32. **Driver-flow socket fixes — Batch 2 of BUG_AUDIT.md (Phase 34 — branch `Yousef2`)** ✅ **DONE**
    - **#4 — addressDetail missing:** `GlobalSocketListener` in `driver-app/_layout.tsx` typed the `driver:request` payload without `addressDetail` and didn't forward it to `router.push` params. Fixed: added `addressDetail?: string` to the type and passed it (`?? ''`) so the delivery address now reaches `request-alert`.
    - **#6 — double navigation:** `driver:request` was listened to in both `_layout.tsx` (GlobalSocketListener, always mounted) and `(tabs)/index.tsx` (Home tab). Both called `router.push('/request-alert')`, pushing the modal twice per incoming request. Removed the listener from `index.tsx` entirely; `_layout.tsx` is the sole authoritative handler. The `order:status_update` listener in `index.tsx` (orders list refresh) is kept.
    - **#7 — spurious `driver:request` from `updateStatus` and `adminIntervention`:** `updateStatus` emitted `driver:request` on PICKED_UP — the legacy direct-assign path unused in the two-step flow. Removed entirely from `updateStatus`. `adminIntervention` emitted it whenever any driver was on the order regardless of new status (DELIVERED/CANCELLED/payment changes all triggered it). Guarded behind `dto.status === PICKED_UP`.
    - **Round-trip verified (code-level):** `sendDriverRequest` → one emit → one `GlobalSocketListener` push → `request-alert` with full `addressDetail` → accept → `emitOrderStatusUpdateToBusiness` (B2 still intact) → `active-delivery` reads address from API → deliver → `emitOrderStatusUpdate` to customer.
    - **tsc:** customer ✅ 0 | business ✅ 0 | driver ✅ 0 | api ✅ 0.

31. **Security + Crash fixes — Batch 1 of BUG_AUDIT.md (Phase 33 — branch `Yousef2`)** ✅ **DONE**
    - **#8 — SECURITY (critical):** `POST /auth/register` accepted a `role` field via `RegisterDto` (validated only by `@IsEnum(UserRole)`, not restricted to CUSTOMER). The service used `dto.role ?? UserRole.CUSTOMER`, so `{ role: 'ADMIN' }` created an admin account. **Confirmed exploitable on live prod** (a test ADMIN was created during audit — delete user `fb0bab3c-ff93-47c3-988b-461a5e7ff8ce`). Fix: removed `role` field from `RegisterDto` entirely; `AuthService.register` hardcodes `UserRole.CUSTOMER`.
    - **#3 — SECURITY:** `otp.tsx` discarded the `otpVerify` response — `verified: false` (HTTP 200) navigated to `/sections` just like a success. Fixed: check `result.verified === true` before navigating; show Arabic error otherwise.
    - **#2 — CRASH:** `otp.tsx:12` called `useRouter()` via `require('expo-router')` inside the component body (Rules of Hooks violation, shadowed the correct top-level import). Fixed: removed the `require()` line; uses the top-level `useRouter()` already imported.
    - **#5 — BROKEN in prod:** `banners/page.tsx:84` and `tags/page.tsx:109` in admin built media URLs with hardcoded `http://127.0.0.1:3001`. Fixed: both now import `BASE_URL` from `@shu/api-client` (reads `NEXT_PUBLIC_API_URL`).
    - **Bonus:** cleared all pre-existing tsc errors in business-app (`fontFamily.normal` → `.regular`, `spacing[0]` → `0`, `business.area?.city`) and driver-app (`dir` prop on RN Text → `writingDirection` style).
    - **tsc status:** customer-app ✅ 0 | business-app ✅ 0 | driver-app ✅ 0 | API ✅ 0.

30. **Bug-fix batch — Business & Customer apps (Phase 32 — branch `Yousef2`)** ✅ **DONE**
    - **B1 — register crash:** `register.tsx` used `React.useMemo` without the default `React` import. Added `import React` — crash fixed.
    - **B2 — driver-acceptance stuck:** `driver-selection.tsx` pending spinner only reacted to `PICKED_UP`. Now any non-READY `order:status_update` navigates to the order detail. Added an `AppState` `change` listener that re-polls the order on foreground resume to catch missed socket events.
    - **B3 — footer year:** Business login footer updated from "2024" → "2026".
    - **B4 — forgot-password WhatsApp:** "نسيت كلمة المرور؟" and "تواصل مع الدعم" now show an Alert with a functional `wa.me/970569703134` WhatsApp deep link.
    - **C1 — PATCH /auth/profile:** endpoint was correctly added in Phase 30; needs `nest build` + API restart to be live (no code change needed).
    - **C2 — categories RTL:** `categoriesScroll` contentContainerStyle changed to `flexDirection: 'row-reverse'` so category chips start from the right.
    - **C3 — cart tab:** already present with item-count badge (no change needed).
    - **C4 — profile truncation + contact-us:** `menuItemLeft` → `flex: 1`; `menuItemLabel` → `flexShrink: 1`. "اتصل بنا" now opens Alert with a working WhatsApp deep link (+970 569 703 134).
    - **C5 — orders duplicate header:** set `headerShown: false` on the orders tab in `_layout.tsx`; single custom header remains.
    - **Verified:** `tsc --noEmit` customer-app ✅ 0 errors; business-app ✅ 0 new errors (4 pre-existing in untouched `profile.tsx`); driver-app ✅ 0 new errors (1 pre-existing in untouched `login.tsx`).

29. **In-app notifications parity (business + driver) + push sound (Phase 31 — branch `Yousef2`)** ✅ **DONE** — brought the customer-app notification UX to the other two apps and made pushes audible.
    - **Sound (all apps):** FCM payload in `NotificationsService.send` now requests sound explicitly — `android.notification {{ sound:'default', channelId:'default', defaultSound:true }}` + `apns.payload.aps.sound:'default'`. Each app's Android channel (`usePushNotifications`) now sets `sound:'default'` + a `vibrationPattern` (HIGH importance alone wasn't guaranteeing a tone). So a delivered push rings + vibrates like any normal push, foreground (handler already had `shouldPlaySound:true`) and background.
    - **Business app:** added `notifications.store` (Zustand+persist, key `shu-business-notifications`), a `NotificationBell` (unread badge) placed in the Dashboard header next to the open/closed switch, and `app/notifications.tsx` (list + mark-all-read + empty state; taps open `/order/[id]`). The push hook now records foreground + tap + cold-start notifications into the store (deduped by FCM request id), so merchants get an in-app history, not just transient banners.
    - **Driver app:** same treatment — `notifications.store` (key `shu-driver-notifications`), `NotificationBell` in the Home greeting row, `app/notifications.tsx` (taps open `/request-alert`), and the push hook records into the store. Created `apps/driver-app/src/components/` (didn't exist).
    - **Backend triggers unchanged** — business already gets `order_new`, driver gets `driver_request`, customer gets every status incl. CANCELLED; all now carry sound.
    - **Verified:** `nest build` ✅. `tsc --noEmit`: customer ✅ 0 errors; business/driver — **0 new errors** in any touched file (the 6 business + 1 driver remaining errors are all pre-existing in `register.tsx`/`profile.tsx`/`login.tsx`, untouched here). Real push delivery still needs a native dev build on a physical device (Expo Go ignores `google-services.json`).

## 🗂️ How to use this file (for AI agents)

- **Read this first**, then the two spec files, before starting work.
- When you finish work: move items from *What's missing* → *What's been done*, update *Last updated* and *Current phase*, and re-order *Next steps*.
- Record any **non-obvious decisions or gotchas** in *Key facts* (e.g. the Nx pin, the pnpm build allow-list) so the next agent doesn't rediscover them.
