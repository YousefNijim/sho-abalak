# شو عبالك؟ — Progress & Handoff Log

> **Living status document.** AI agents read this at the start of every session and update it at the end.
> The spec lives in [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) (what to build) and [FRONTEND_DESIGN.md](./FRONTEND_DESIGN.md) (how it should look). This file tracks **actual progress against that spec**.

**Last updated:** 2026-05-29
**Current phase:** Phase 0 → Phase 1 (scaffolding complete, feature work not started)

---

## 🔑 Key facts an agent needs before touching this repo

- **Monorepo:** Nx + pnpm workspaces. Stack per [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md).
- **Package manager:** pnpm 10. Build scripts are **blocked by default** — the allow-list lives in `pnpm-workspace.yaml` under `onlyBuiltDependencies` (`prisma`, `@prisma/*`, `bcrypt`, `@nestjs/core`, `nx`). Add to it if a new dep needs a postinstall.
- **Nx is pinned to `19.8.4`** (root `package.json`). `19.8.15` was unpublishable due to a registry mismatch on `@nrwl/tao` — do not bump blindly.
- **Design tokens are code:** [`packages/ui-components/src/tokens.ts`](./packages/ui-components/src/tokens.ts) is the single source of truth for colors/fonts/spacing. Every app imports from `@shu/ui-components`. Do not hardcode brand colors.
- **RTL is mandatory.** Mobile apps force RTL in `app/_layout.tsx`; admin sets `dir="rtl"` in the root layout.
- **Stitch design system already exists** — see the MCP section below. Do not create a duplicate.

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

### apps/admin-dashboard (`@shu/admin-dashboard`) — Next.js 14
- App Router (`layout.tsx` with `dir="rtl"`, `page.tsx` branded landing, `globals.css`)
- `tailwind.config.ts` themed with brand colors, `next.config.mjs` (transpiles `@shu/*`)
- **Verified:** `tsc --noEmit` passes.

### apps/customer-app, business-app, driver-app (`@shu/customer-app`, etc.) — Expo SDK 51
- Each: `package.json`, `app.json` (RTL, brand splash), `tsconfig.json`, `babel.config.js`
- `app/_layout.tsx` (expo-router root, forces RTL, brand header) + `app/index.tsx` (branded landing per app role)

### Dependencies & verification
- `pnpm install` completed (Nx pinned).
- Prisma client generated.
- API builds, admin typechecks. Mobile apps not yet run on a device/emulator.

### Stitch MCP (design)
- MCP connected and verified.
- Design system **"Heritage Pulse"** already exists in Stitch project **"Multilingual Web Interface Development"** (project ID `12297570441858941970`), generated from FRONTEND_DESIGN.md — correct palette, Cairo+Montserrat, RTL, ~30 screens. **No duplicate created.**

---

## ⚠️ What's missing / not done

### API (apps/api) — only scaffold exists
- No feature modules: **auth** (JWT + bcrypt, OTP), **users**, **businesses**, **products**, **orders**, **drivers**, **areas**, **reviews**, **payments**.
- No **Socket.io gateway** (events are typed in shared-types but not implemented).
- No **Redis** integration (ioredis is installed, not wired).
- No DTOs/validation, no guards/role decorators, no tests.
- **DB not migrated yet** — `prisma migrate` and `seed` have not been run (needs Docker + `.env`).
- Firebase FCM, S3/Cloudinary uploads: not started.

### Mobile apps — only branded landing screens
- No navigation tree, no real screens. Per FRONTEND_DESIGN.md the Phase-1 (MVP) screens still to build:
  - **Customer:** Splash, Onboarding, Login, Register, OTP, Home, Business Detail, Cart, Order Tracking.
  - **Business:** Dashboard, Order Detail, Driver selection, (Menu mgmt = phase 2).
  - **Driver:** Home, Request Alert, Active delivery.
- No API client, no React Query setup, no Zustand stores, no Socket.io-client wiring (deps installed only).

### Admin dashboard — only landing page
- No sidebar/layout, no Dashboard/Orders/Businesses/Users/Drivers/Areas/Finance pages.
- Recharts + TanStack Table installed but unused. **shadcn/ui not yet initialized.**

### Shared
- `packages/ui-components` has tokens only — **no actual React/RN components** yet (Button, Card, Input, StatusBadge component, BottomSheet, etc.).

### Infra
- No CI (GitHub Actions), no Nginx, no Sentry, no deploy config. No git remote/commits yet.

---

## 👉 Next steps (suggested order)

1. **Bring up the DB.** `cp apps/api/.env.example apps/api/.env` → `pnpm db:up` → `pnpm --filter @shu/api prisma:migrate` → `prisma:seed`. Verify areas seeded.
2. **API auth module** — register/login (phone + password), JWT, bcrypt, role guard, OTP stub. This unblocks every app.
3. **API orders + businesses + products modules** — CRUD + the order-status state machine (reuse `@shu/utils` `canTransition`).
4. **Socket.io gateway** — implement the 5 events from `@shu/shared-types` `SocketEvents`; wire Redis for real-time state.
5. **Shared UI components** — build Button/Card/Input/StatusBadge in `@shu/ui-components` from the tokens, so all apps reuse them.
6. **Customer app MVP flow** — auth → Home → Business Detail → Cart → Tracking, against the live API. Pull layouts from the Stitch project to match the design.
7. **Business + Driver app MVP flows.**
8. **Admin dashboard** — init shadcn/ui, build sidebar + Dashboard + Orders pages.
9. **Infra** — GitHub remote + first commit, CI, Sentry.

---

## 🗂️ How to use this file (for AI agents)

- **Read this first**, then the two spec files, before starting work.
- When you finish work: move items from *What's missing* → *What's been done*, update *Last updated* and *Current phase*, and re-order *Next steps*.
- Record any **non-obvious decisions or gotchas** in *Key facts* (e.g. the Nx pin, the pnpm build allow-list) so the next agent doesn't rediscover them.
