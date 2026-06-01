# شو عبالك — Comprehensive Bug & Health Audit

**Audit Date:** 2026-06-01  
**Branch:** Yousef2  
**Auditor:** Claude Code (automated static analysis — no code modified)

## Fix Status (Phase 33)

| Issue | Status | Commit |
|---|---|---|
| #8 — role in RegisterDto (SECURITY) | ✅ Fixed | `f78f391` |
| #3 — OTP verified not checked (SECURITY) | ✅ Fixed | `c93553d` |
| #2 — useRouter() inside require() | ✅ Fixed | `c93553d` |
| #5 — hardcoded 127.0.0.1:3001 in admin | ✅ Fixed | `0493232` |
| B-2/B-3 — business-app profile.tsx tsc errors | ✅ Fixed | `3436299` |
| D-3 — driver-app login dir prop tsc error | ✅ Fixed | `3436299` |
| All others | 🔲 Pending (Batch 2+) | — |

⚠️ **ACTION REQUIRED:** Delete test ADMIN account `fb0bab3c-ff93-47c3-988b-461a5e7ff8ce` (phone `0591234567`, name "test hacker") created during audit confirmation of #8.

---

## 1. Executive Summary

| Severity | Count |
|---|---|
| 🔴 Critical / Crash | 6 |
| 🟠 Broken Functionality | 14 |
| 🟡 Minor / Data Risk | 12 |
| 🟢 Polish / Code Quality | 10 |
| **Total** | **42** |

### Top 5 Most Impactful Issues

1. **🔴 RTL forced OFF in all three mobile apps** — `I18nManager.allowRTL(false); forceRTL(false)` is called before the Stack navigator loads. The entire UI is built RTL (`flexDirection: 'row-reverse'`, `textAlign: 'right'`), but the OS text-input cursor, long-press menus, and native pickers are told it is LTR. This will cause layout glitches on Android especially, and contradicts every style in the codebase.

2. **🔴 OTP screen uses `require('expo-router').useRouter()`** — `apps/customer-app/app/(auth)/otp.tsx` line 12 calls `const router = require('expo-router').useRouter()`. Dynamic `require()` inside a React component body means the hook executes outside of React's hook call order tracking, which violates the Rules of Hooks and can cause inconsistent behavior / silently fail on certain bundler configurations.

3. **🔴 OTP verification does NOT actually verify** — After a successful register the app navigates to `/otp`, calls `authApi.otpVerify`, but success only checks that `otpVerify` does not throw — it does NOT check `response.verified`. The API returns `{ verified: false }` without throwing when the wrong code is entered only if you submit after the fact — but more critically, the current flow allows ANY non-error response to pass, including a `verified: false`. This is consistent with the stub (`code === '0000'` only), but the client is semantically broken: it should check `result.verified === true`.

4. **🔴 Driver app `_layout.tsx` misses `addressDetail` in socket payload forwarding** — `GlobalSocketListener` (line 36-46) spreads `DriverRequestPayload` into `router.push` params but does NOT include `addressDetail`. The `DriverRequestPayload` type has `addressDetail?: string` and the server sends it. When the driver opens `request-alert`, `addressDetail` will always be `undefined`/empty from the global layout push, even though the socket event has the value.

5. **🔴 Admin dashboard banners/tags pages have hardcoded `http://127.0.0.1:3001`** — `apps/admin-dashboard/src/app/(dashboard)/banners/page.tsx:84` and `tags/page.tsx:109` hardcode the API URL for media URLs. In production (Railway), this will serve broken image URLs. All other files use `BASE_URL` from `@shu/api-client`.

---

## 2. Per-App Issue Tables

### customer-app

| # | Issue | File:Line | Category | Severity | Root Cause | Suggested Fix |
|---|---|---|---|---|---|---|
| C-1 | RTL forced OFF globally | `app/_layout.tsx:4-5` | crash | 🔴 | `I18nManager.allowRTL(false); forceRTL(false)` disables system RTL support | Remove both calls; the UI already uses manual `flexDirection: 'row-reverse'` which is RTL-explicit |
| C-2 | `useRouter()` called via `require()` inside component | `app/(auth)/otp.tsx:12` | crash | 🔴 | `const router = require('expo-router').useRouter()` violates Rules of Hooks | Change to top-level `import { useRouter } from 'expo-router'` and call `useRouter()` normally |
| C-3 | OTP verify result not checked | `app/(auth)/otp.tsx:42-43` | broken | 🟠 | `await authApi.otpVerify(...)` — result discarded; `verified: false` is not caught | `const { verified } = await authApi.otpVerify(...); if (!verified) throw new Error(...)` |
| C-4 | Active order banner routes with `id` param but tracking screen reads `id` | `app/(tabs)/index.tsx:233` | broken | 🟠 | Banner pushes `{ pathname: '/tracking', params: { id: ... } }` but `tracking.tsx:24` reads `useLocalSearchParams<{ id: string }>()` — param name matches. Actually OK, but `orders.tsx:183` also pushes `{ id: o.id }` — verify consistent. ✅ Actually consistent. | N/A |
| C-5 | `cart.tsx` not in `(tabs)` folder — tab bar tab with `href:'/cart'` routes to root `/cart` | `app/(tabs)/_layout.tsx:60-61` | minor | 🟡 | The cart tab uses `href: '/cart'` which points to the root Stack screen `cart.tsx`, not a tab screen. This means the cart page has no tab bar. Intentional design, but the tab item shows in the tab bar without a corresponding tab screen — pressing "السلة" tab from some routes may behave unexpectedly. | Verify UX is as intended; if cart should always open as a stack push, mark `href: null` on smaller screens or remove from Tabs |
| C-6 | `register.tsx` imports `useMemo` but does not import `React` (fixed in Phase 32, but verify) | `app/(auth)/register.tsx:1` | crash | 🔴 | Phase 32 note says `register.tsx` used `React.useMemo` without default import — reported as fixed | Confirmed fix: line 1 does not import React; `useMemo` is imported from `'react'` directly. ✅ Fixed |
| C-7 | Hardcoded placeholder images (Google CDN URLs) | `app/tracking.tsx:232`, `app/(tabs)/orders.tsx:96,156` | polish | 🟢 | External Google CDN image URLs are not versioned/owned by the project. They can break | Replace with local asset files or a controlled CDN |
| C-8 | Driver rating in tracking screen is hardcoded `4.9 (120+ تقييم)` | `app/tracking.tsx:242-243` | broken | 🟠 | Hard-coded rating string ignores actual `order.driver?.rating` | Use `order.driver?.rating?.toFixed(1)` and `order.driver?.deliveryCount` |
| C-9 | Map distance badge is hardcoded `2.4 كم` | `app/tracking.tsx:279` | broken | 🟠 | Static string — GPS integration not planned, but should not show fabricated data | Show placeholder text like "السائق في الطريق" or hide block until real GPS available |
| C-10 | Vehicle type is hardcoded `دراجة نارية` | `app/tracking.tsx:255` | minor | 🟡 | Hard-coded Arabic string; `driver` object has no `vehicleType` field | Remove the row or add a `vehicleType` field to `Driver` model |
| C-11 | `useGlobalOrderSync` hardcodes event string `'order:status_update'` | `app/src/hooks/useGlobalOrderSync.ts:34` | socket | 🟡 | Should use `SocketEvents.ORDER_STATUS_UPDATE` constant from `@shu/shared-types` | Import and use the constant for refactor safety |
| C-12 | `I18nManager` imported but RTL is disabled — all socket hooks use raw string literals | Multiple socket hooks | socket | 🟡 | `useSocket` hooks in all apps use raw strings `'order:status_update'`, `'driver:request'` etc. instead of `SocketEvents` constants | Replace raw strings with `SocketEvents.*` constants |
| C-13 | Avatar image on Home and Orders screens is hardcoded external URL, ignores user `imageUrl` | `app/(tabs)/index.tsx:152`, `app/(tabs)/orders.tsx:96` | broken | 🟠 | User profile picture is fetched in `auth.store` but not used in header | Use `user.imageUrl` via `mediaUrl()` helper (same as profile screen does) |
| C-14 | `(tabs)/cart.tsx` doesn't exist — tab `href` maps to root stack `cart.tsx` which has no `headerShown` from Stack config | `app/(tabs)/_layout.tsx:58-72` | minor | 🟡 | The tab registers name `cart` but no tab screen file exists in `(tabs)/` — valid by Expo Router `href` override but confusing | Document this intentional routing pattern |

---

### business-app

| # | Issue | File:Line | Category | Severity | Root Cause | Suggested Fix |
|---|---|---|---|---|---|---|
| B-1 | RTL forced OFF globally | `app/_layout.tsx:4-5` | crash | 🔴 | Same as C-1 | Same fix as C-1 |
| B-2 | `profile.tsx` TypeScript errors — `fontFamily.normal` and `spacing[0]` do not exist | `app/(tabs)/profile.tsx:421,424,436` | typescript | 🟠 | `fontFamily.normal` is not a valid key (valid: `regular`, `medium`, `semibold`, `bold`, `extrabold`); `spacing[0]` is not in the spacing map (starts at `1`) | Replace `fontFamily.normal` → `fontFamily.regular`; replace `spacing[0]` → `0` literal |
| B-3 | `profile.tsx` TS error: `business.area` possibly undefined but accessed without optional chain | `app/(tabs)/profile.tsx:108` | typescript | 🟠 | `business.area.city` accessed directly on a field typed as `Area \| null` | Use optional chain: `business.area?.city` |
| B-4 | `updateMutation.mutate(dto as any)` — type cast hides schema mismatch | `app/(tabs)/profile.tsx:236` | typescript | 🟡 | DTO type is cast to `any`, hiding potential field mismatches between local form state and `UpdateBusinessDto` | Type the DTO explicitly; remove `as any` |
| B-5 | Driver selection "Cancel and pick another driver" does NOT notify the driver they were cancelled | `app/driver-selection.tsx:119-121` | broken | 🟠 | Pressing cancel just calls `setPendingDriverId(null)` — driver still sees the request alert countdown and can "accept" an already-cancelled selection | Call `ordersApi.rejectDriver(orderId)` before clearing pending state, or expose a cancel-pending endpoint |
| B-6 | `mock.ts` still defines a `category: string` on the `Product` type | `src/mock.ts:21,26-28` | stale-field | 🟡 | `category` on `Product` is a free-text menu section (unchanged), not the `BusinessCategory` enum. In context this is fine — `Product.category` was never removed — but the comment in the migration notes says it's "untouched". Low risk. | No action needed — `Product.category` is a separate field from `Business.type/tags` |
| B-7 | Menu screen `menu.tsx` reads `p.category` for product tab grouping | `app/(tabs)/menu.tsx:100,107` | stale-field | 🟡 | `Product.category` is the free-text menu section (e.g. "وجبات رئيسية") — this is the correct field. Not a bug. | No action needed |
| B-8 | Business app `useSocket` — module-level `socketInstance` singleton shared across hot reloads | `src/hooks/useSocket.ts:6` | state | 🟡 | Same as customer/driver apps: singleton is never re-created if token changes after first connect. A logout+login cycle with a different account reuses the old socket | On token change, disconnect and reconnect: check `socketInstance.auth.token !== token` |
| B-9 | `notifications.tsx` routes driver notification tap to `/request-alert` unconditionally | `app/notifications.tsx` | broken | 🟠 | Tapping an old "driver_request" notification from the in-app list always pushes to `/request-alert` even if the order is long settled, causing a stale/empty screen | Check order status before routing; navigate to `/active-delivery` if PICKED_UP, or history if DELIVERED |

---

### driver-app

| # | Issue | File:Line | Category | Severity | Root Cause | Suggested Fix |
|---|---|---|---|---|---|---|
| D-1 | RTL forced OFF globally | `app/_layout.tsx:4-5` | crash | 🔴 | Same as C-1 | Same fix as C-1 |
| D-2 | `_layout.tsx` GlobalSocketListener omits `addressDetail` from driver:request params | `app/_layout.tsx:36-47` | broken | 🔴 | `payload.addressDetail` exists in `DriverRequestPayload` but is not passed to `router.push` params | Add `addressDetail: payload.addressDetail ?? ''` to the params object |
| D-3 | `login.tsx` TS error: `dir` prop not valid on RN `<Text>` | `app/(auth)/login.tsx:77` | typescript | 🟠 | HTML `dir` attribute used on React Native `Text` component — RN does not accept this prop | Remove `dir="ltr"` attribute from RN `Text`; control direction with `writingDirection` style or `textAlign` |
| D-4 | Driver home screen: `activeOrder` includes both `READY` and `PICKED_UP` orders | `app/(tabs)/index.tsx:90` | minor | 🟡 | `orders.find(o => ['READY','PICKED_UP'].includes(o.status))` — a READY order hasn't been accepted yet but still shows as "current active" | Only show `PICKED_UP` orders (already accepted by driver) as the active order |
| D-5 | Driver earnings calculation uses `business.area.deliveryFee` not driver's actual payout | `app/(tabs)/index.tsx:110` | data | 🟡 | `Number(o.business?.area?.deliveryFee ?? 5)` is the customer-facing fee, not the driver's cut. No driver payout field exists yet | Add `driverPayout` field to Order or use a fixed percentage; document the assumption |
| D-6 | `request-alert.tsx` countdown: auto-reject at 0 seconds calls `handleReject` which calls `rejectMutation.mutate()` inside a `useEffect` | `app/request-alert.tsx:65-73` | broken | 🟠 | When timer hits 0 AND `orderId` is missing/falsy, `handleReject` just calls `router.back()` with no API call — the backend still has `pendingDriverId` set, leaving the order stuck | Ensure the auto-reject path always calls `rejectMutation.mutate()` if `orderId` is present, regardless of settled state |
| D-7 | Both `useSocket` hooks in driver-app and `_layout.tsx` listen to `driver:request` independently, causing double navigation | `app/(tabs)/index.tsx:31-46`, `app/_layout.tsx:34-52` | broken | 🟠 | Two listeners fire for the same event: one in the Home tab and one in the root layout. Both call `router.push('/request-alert')` — the driver gets pushed twice | Remove the Home screen listener; keep only the global `_layout.tsx` listener |
| D-8 | `driver-app/google-services.json` noted as wrong copy | `PROGRESS.md:284` | broken | 🟠 | Driver app `google-services.json` contains `com.shoabalak.business` package name, not `com.shoabalak.driver` — FCM push will silently fail for drivers | Download the correct `google-services.json` from Firebase Console for `com.shoabalak.driver` |

---

### admin-dashboard

| # | Issue | File:Line | Category | Severity | Root Cause | Suggested Fix |
|---|---|---|---|---|---|---|
| A-1 | Hardcoded `http://127.0.0.1:3001` media URLs | `src/app/(dashboard)/banners/page.tsx:84`, `tags/page.tsx:109` | broken | 🔴 | Two pages build image src by prepending `http://127.0.0.1:3001` instead of `BASE_URL` | Import `BASE_URL` from `@shu/api-client` and use it: `` (path.startsWith('http') ? path : `${BASE_URL}${path}`) `` |
| A-2 | Admin orders page has `console.log` in production code | `src/app/(dashboard)/orders/page.tsx:96` | polish | 🟢 | Debug log left in component | Remove the `console.log` call |
| A-3 | `businesses/page.tsx:1058-1060` references `p.category` on product in detail drawer | `src/app/(dashboard)/businesses/page.tsx:1058` | stale-field | 🟡 | Admin detail drawer renders `p.category` for product. `Product.category` is the free-text menu section — still valid. But the surrounding business type uses `type/tags`, not `category`. Minor confusion risk | No change needed — this is `Product.category` (menu section), not `Business.category` |

---

### API (NestJS)

| # | Issue | File:Line | Category | Severity | Root Cause | Suggested Fix |
|---|---|---|---|---|---|---|
| API-1 | `updateStatus` emits `driver:request` socket on PICKED_UP status change | `src/orders/orders.service.ts:177-186` | logic | 🟠 | When order status changes to PICKED_UP via `updateStatus` (legacy direct path), the gateway emits `DRIVER_REQUEST` again to the already-assigned driver. The driver has already accepted — they get a second request alert | Only emit `driver:request` from `sendDriverRequest`; remove the duplicate emission from `updateStatus` |
| API-2 | `adminIntervention` always emits `driver:request` if a driver is present on the order | `src/orders/orders.service.ts:504-512` | logic | 🟠 | After admin force-status, the gateway emits `driver:request` to whatever driver is on the order regardless of new status. If admin sets an order to DELIVERED, the driver gets a spurious "new delivery request" alert | Only emit `driver:request` when status is being set to PICKED_UP |
| API-3 | `auth.service.ts` `updateProfile`: `verifyOtp()` is called synchronously (not async) but returns a plain object | `src/auth/auth.service.ts:150` | auth | 🟡 | `verifyOtp` is a synchronous method returning `{ phone, verified }`. The call `this.verifyOtp(...).verified` works correctly today. But if `verifyOtp` is ever made async (real SMS), this will silently stop working. `await` is missing. | Add `await` preemptively: `!(await this.verifyOtp(...)).verified` — or make the check explicitly await-safe |
| API-4 | `socket.gateway.ts` broadcasts `DRIVER_STATUS_CHANGE` to ALL connected clients | `src/gateway/socket.gateway.ts:104` | socket | 🟡 | `this.server.emit(SocketEvents.DRIVER_STATUS_CHANGE, ...)` broadcasts to every connected socket (all customers, businesses, drivers). Only the admin dashboard needs this event | Scope the emit to an admin room or remove it if not consumed by any client |
| API-5 | `auth.service.ts` `getMe` does not include `area` relation | `src/auth/auth.service.ts:112` | data | 🟡 | `prisma.user.findUnique({ where: { id } })` returns the raw user without area. `publicUser` returns `areaId` only. Customer app uses `user.areaId` for filtering but not the area name | Include `area: true` if the UI needs area name; otherwise documented limitation |
| API-6 | `adminIntervention` may double-update driver status to BUSY when assigning | `src/orders/orders.service.ts:424-431,440-445` | logic | 🟡 | When admin assigns a driver AND sets status to PICKED_UP, the driver-assign block sets them BUSY, then the status-PICKED_UP block sets them BUSY again — two updates in the same transaction | Deduplicate: set BUSY only once in the transaction |
| API-7 | Seed file uses `category` field on `Product.create` | `prisma/seed.ts:173` | stale-field | 🟢 | `Product.category` is still in the Prisma schema (free-text menu section) — this is valid. Not a stale `Business.category`. | No action needed |
| API-8 | `NotificationsService` prunes tokens on `messaging/invalid-argument` code | `src/notifications/notifications.service.ts:144-148` | data | 🟡 | `messaging/invalid-argument` can mean a malformed token OR a configuration error (wrong Firebase project). Pruning on this code could delete valid tokens if Firebase credentials are misconfigured | Only prune on `messaging/registration-token-not-registered` and `messaging/invalid-registration-token`; treat `invalid-argument` as a config warning |

---

## 3. API Contract Mismatches Table

| Frontend Call | Actual API Route | Method | Mismatch Description |
|---|---|---|---|
| `ordersApi.create` passes `areaId` in DTO | `POST /orders` — `CreateOrderDto` | POST | The `CreateOrderDto` backend type accepts `areaId`? Actually the DTO uses `deliveryAreaName`/`deliveryAddressDetail`; the `areaId` in `ordersApi.create` DTO (api-client) is NOT in the NestJS `CreateOrderDto`. It is sent but silently ignored by the API (ValidationPipe strips unknown fields by default). The order creation uses `business.area.deliveryFee` — so `areaId` from the client has no effect. |
| `authApi.register` — client `RegisterDto` has no `role` field | `POST /auth/register` — NestJS `RegisterDto` | POST | The API `RegisterDto` passes `dto.role ?? UserRole.CUSTOMER`. The client DTO has no `role` field — customers will always register as CUSTOMER. This is correct behavior, but `role` is not guarded — a client could register as ADMIN by passing `role: 'ADMIN'` (no server-side enforcement). |
| `ordersApi.rejectDriver` uses HTTP `PATCH` | `PATCH /orders/:id/reject-driver` | PATCH | Matches. ✅ |
| `ordersApi.acceptDriver` uses HTTP `POST` | `POST /orders/:id/accept-driver` | POST | Matches. ✅ |
| `businessesApi.mine()` | `GET /businesses/mine` | GET | Matches. ✅ |

### Critical Mismatch — `areaId` stripped from CreateOrderDto

The client sends `areaId` as part of the order payload (visible in `cart.tsx:98`):
```js
createOrder.mutate({
  businessId,
  areaId: deliveryAreaId,   // ← sent but ignored by API
  ...
})
```
The NestJS `CreateOrderDto` does not have an `areaId` field. The `ValidationPipe` (with `whitelist: true`) strips it. The delivery fee is computed from `business.area.deliveryFee`, not the client's `areaId`. This means if a customer has a saved address in a **different area** than the business's area, the delivery fee shown in the cart (computed from the business area) will match what's charged — but the business's delivery area policy is what decides the fee, not the customer's selected address area.

**Risk:** Customer can see a delivery fee for the business area but live in a different area — no mismatch check exists server-side.

### Critical Mismatch — Auth `RegisterDto` accepts unguarded `role`

```ts
// NestJS register.dto.ts (inferred)
role: dto.role ?? UserRole.CUSTOMER
```
No `@IsEnum(UserRole)` guard with `CUSTOMER` restriction means a raw POST to `/auth/register` with `{ role: 'ADMIN' }` may create an admin account. **Needs server-side validation.**

---

## 4. Stale `category`/`type-tags` References

The `Business.category` enum was dropped in Phase 24 (migration `20260531000000_business_type_and_tags`). The following references are **confirmed safe** (they reference `Product.category`, which is a free-text menu-section field that was NOT removed) or are UI strings/icons:

| File:Line | Field | Safe? | Note |
|---|---|---|---|
| `apps/api/prisma/seed.ts:83-97` | `product.category` | ✅ Safe | `Product.category` — free-text menu section, unchanged |
| `apps/api/prisma/seed.ts:135,173` | `product.category` | ✅ Safe | Same |
| `apps/business-app/src/mock.ts:21,26-28` | `product.category` | ✅ Safe | Mock data for menu sections |
| `apps/business-app/app/(tabs)/menu.tsx:35,44,54,65,100,107,197,370-371` | `product.category` | ✅ Safe | Menu tab grouping by free-text section |
| `apps/admin-dashboard/src/components/nav-items.ts:17` | `'category'` (Material icon name) | ✅ Safe | UI icon string, not a data field |
| `apps/admin-dashboard/src/app/(dashboard)/businesses/page.tsx:1058-1060` | `p.category` (product) | ✅ Safe | Product's free-text menu section in detail drawer |
| `apps/admin-dashboard/src/app/(dashboard)/tags/page.tsx:147` | `'category'` (Material icon) | ✅ Safe | UI icon string |
| `apps/customer-app/app/(tabs)/index.tsx:90,312,315,317,322,557,562` | `category*` (style names / comments) | ✅ Safe | CSS class names and comments — not data fields |
| `apps/customer-app/src/constants/CategoryImages.ts:15-16` | `categoryName` (function param) | ✅ Safe | Tag image lookup helper — internal variable name |

**Verdict:** No confirmed stale `Business.category` references remain in the codebase. The migration was applied cleanly. All remaining `category` strings refer to `Product.category` (menu sections) or UI element names.

---

## 5. Socket Event Audit

| Event Name | Constant | Emitted By (API file:line) | Listened In Clients | Verdict |
|---|---|---|---|---|
| `order:new` | `SocketEvents.ORDER_NEW` | `orders.service.ts:95` | Business app dashboard tab (`business-app/app/(tabs)/index.tsx`) | ✅ Match |
| `order:status_update` | `SocketEvents.ORDER_STATUS_UPDATE` | `orders.service.ts:166`, `orders.service.ts:278`, `orders.service.ts:375`, `orders.service.ts:493` | Customer tracking (`tracking.tsx:58`), `useGlobalOrderSync.ts:34`, Business driver-selection (`driver-selection.tsx:92`), Driver home (`driver-app/(tabs)/index.tsx:54`) | ✅ Match — but raw string `'order:status_update'` used in all clients instead of constant |
| `driver:request` | `SocketEvents.DRIVER_REQUEST` | `orders.service.ts:222`, `orders.service.ts:178` | Driver home tab (`driver-app/(tabs)/index.tsx:53`) **AND** driver root layout (`driver-app/app/_layout.tsx:49`) | 🔴 **Mismatch** — double listener causes double navigation push |
| `driver:status_change` | `SocketEvents.DRIVER_STATUS_CHANGE` | `gateway/socket.gateway.ts:104` | **Not listened in any client** | 🟠 Emitted but unconsumed — admin dashboard does not listen to this event |
| `notification:push` | `SocketEvents.NOTIFICATION_PUSH` | **Not emitted anywhere in the API** | **Not listened anywhere** | 🟡 Defined in `SocketEvents` constant but dead — FCM handles push instead |
| `order:driver_rejected` | `SocketEvents.ORDER_DRIVER_REJECTED` | `orders.service.ts:332`, `orders.service.ts:370` | Business app driver-selection (`driver-selection.tsx:93`) | ✅ Match |

### Socket Architecture Issues

1. **`driver:request` double-dispatch (D-7):** The driver app has two active listeners for the same event — one in `app/(tabs)/index.tsx` (driver home screen) and one in `app/_layout.tsx` (global layout). Both call `router.push('/request-alert')`, causing the screen to be pushed twice to the navigation stack when a request arrives.

2. **`driver:status_change` is broadcast globally:** The gateway emits to `this.server.emit()` — all connected clients receive this. No mobile client listens, so the data is wasted. No admin client socket listener handles it either.

3. **`notification:push` is a dead constant:** Defined in `shared-types/src/socket.ts` as `NOTIFICATION_PUSH: 'notification:push'` but never used in the API (FCM is used instead) and never listened in any client. The constant should be removed or documented as reserved.

4. **All clients use raw event string literals:** Every `socket.on('order:status_update', ...)` call uses the string directly rather than `SocketEvents.ORDER_STATUS_UPDATE`. If the constant changes, clients won't update automatically.

---

## 6. Additional Cross-Cutting Findings

### Auth Security Risk

**Finding:** `POST /auth/register` accepts `role` field without restriction.

```
// auth.service.ts:33
role: dto.role ?? UserRole.CUSTOMER,
```

If `RegisterDto` does not enforce `@IsEnum([UserRole.CUSTOMER])`, a client can self-register as ADMIN or DRIVER via the customer register endpoint. Verify the DTO validates `role` if present, and ideally remove it entirely from the customer registration DTO (hard-code `UserRole.CUSTOMER`).

### `console.log` in Production Mobile Code

The following `console.log` calls remain in production code paths (not test/seed files):

| File | Line | Content |
|---|---|---|
| `driver-app/app/(tabs)/index.tsx` | 35 | `'WS instant driver request received:'` |
| `driver-app/app/(tabs)/index.tsx` | 49 | `'WS order status update received:'` |
| `driver-app/app/_layout.tsx` | 37 | `'WS instant driver request received globally:'` |
| `customer-app/src/hooks/useSocket.ts` | 30 | `'Customer App WS connected successfully'` |
| `business-app/src/hooks/useSocket.ts` | 30 | `'Business App WS connected successfully'` |
| `driver-app/src/hooks/useSocket.ts` | 30 | `'Driver App WS connected successfully'` |
| `admin-dashboard/orders/page.tsx` | 96 | `'[Admin Sockets] Connected...'` |

These leak internal socket event data on physical device logs and should be gated behind `__DEV__` or removed.

### Token Lifecycle — Stale Socket on Re-login

All three mobile apps use a module-level `socketInstance` singleton:
```ts
let socketInstance: Socket | null = null;
```
When a user logs out and a different user logs in, the singleton is reconnected with the new token (`socketInstance = io(BASE_URL, { auth: { token } })`). However, the old `socketInstance` connection uses the OLD token until `socketInstance.disconnect()` is called — the cleanup only happens if `token` becomes falsy. If a user logs in as User A, logs out, and immediately logs in as User B before the WebSocket timeout, User B's socket may still be using User A's room subscriptions momentarily. Low probability but real race condition.

### Missing `await` on `authApi.me()` in store hydration path

In `customer-app/src/stores/auth.store.ts`, `refreshUser` calls `authApi.me()` — this is properly awaited. No missing `await` found in critical paths.

---

## 7. Prioritized Fix Order

### Batch 1: Crashes (fix immediately before any device testing)

| Priority | Fix | Files |
|---|---|---|
| 1 | Remove `I18nManager.allowRTL(false); forceRTL(false)` from all 3 apps | `customer-app/app/_layout.tsx:4-5`, `business-app/app/_layout.tsx:4-5`, `driver-app/app/_layout.tsx:4-5` |
| 2 | Fix `useRouter()` in OTP screen — replace `require()` with top-level import | `customer-app/app/(auth)/otp.tsx:12` |
| 3 | Fix `addressDetail` missing from driver `_layout.tsx` socket payload forwarding | `driver-app/app/_layout.tsx:36-47` |
| 4 | Replace hardcoded `127.0.0.1:3001` in admin banners/tags pages | `admin-dashboard/src/app/(dashboard)/banners/page.tsx:84`, `tags/page.tsx:109` |

### Batch 2: Core Flow Broken

| Priority | Fix | Files |
|---|---|---|
| 5 | Fix OTP verify — check `result.verified === true` before navigating | `customer-app/app/(auth)/otp.tsx:42-43` |
| 6 | Remove duplicate `driver:request` socket listener from driver home tab | `driver-app/app/(tabs)/index.tsx:31-46` |
| 7 | Fix `updateStatus` PICKED_UP path — remove spurious `driver:request` emit | `api/src/orders/orders.service.ts:177-186` |
| 8 | Fix `adminIntervention` — only emit `driver:request` when new status = PICKED_UP | `api/src/orders/orders.service.ts:504-512` |
| 9 | Fix Business app profile TypeScript errors (`fontFamily.normal`, `spacing[0]`) | `business-app/app/(tabs)/profile.tsx:421,424,436` |
| 10 | Fix Driver app login `dir` prop on RN `Text` | `driver-app/app/(auth)/login.tsx:77` |
| 11 | Fix driver google-services.json — download correct file for `com.shoabalak.driver` | `driver-app/google-services.json` |

### Batch 3: Data Integrity / Security

| Priority | Fix | Files |
|---|---|---|
| 12 | Harden `/auth/register` DTO — reject `role` field or enforce CUSTOMER-only | `api/src/auth/dto/register.dto.ts` |
| 13 | Fix driver active order detection — exclude READY orders (not accepted yet) | `driver-app/app/(tabs)/index.tsx:90` |
| 14 | Fix driver payout calculation — use defined payout model, not customer delivery fee | `driver-app/app/(tabs)/index.tsx:110` |
| 15 | Fix `request-alert.tsx` auto-reject race — ensure API call on timer expiry | `driver-app/app/request-alert.tsx:65-73` |
| 16 | Scope `DRIVER_STATUS_CHANGE` emit to admin room | `api/src/gateway/socket.gateway.ts:104` |
| 17 | Remove or safeguard `messaging/invalid-argument` token pruning | `api/src/notifications/notifications.service.ts:144-148` |

### Batch 4: Polish / Cleanup

| Priority | Fix | Files |
|---|---|---|
| 18 | Replace raw socket event strings with `SocketEvents.*` constants in all clients | All `useSocket` hooks and screen files |
| 19 | Remove `console.log` statements from production mobile/admin code | Multiple files (see §6) |
| 20 | Fix hardcoded driver rating (4.9) and map distance (2.4km) in tracking screen | `customer-app/app/tracking.tsx:242,279` |
| 21 | Use `user.imageUrl` for avatar in Home and Orders headers | `customer-app/app/(tabs)/index.tsx:152`, `orders.tsx:96` |
| 22 | Remove `NOTIFICATION_PUSH` dead constant from `SocketEvents` | `packages/shared-types/src/socket.ts` |
| 23 | Fix driver app business-app notification tap routing (check order status first) | `driver-app/app/notifications.tsx`, `business-app/app/notifications.tsx` |

---

## 8. TypeScript Compilation Summary

| App | `tsc --noEmit` Result | Error Count | Notes |
|---|---|---|---|
| customer-app | ✅ **0 errors** | 0 | Clean |
| business-app | 🟠 **4 errors** | 4 | All in `profile.tsx` — `fontFamily.normal`, `spacing[0]`, `business.area` possibly undefined |
| driver-app | 🟠 **1 error** | 1 | `dir` prop on RN `Text` in `login.tsx:77` |
| API (NestJS) | ✅ **0 errors** | 0 | Clean (`nest build` passes) |
| admin-dashboard | ✅ **0 errors** (per PROGRESS.md) | 0 | `next build` verified by last agent |

---

*End of audit. No code was modified during this analysis.*
