# شو عبالك؟ — Shu Abalak

> منصة الطلبات للمطاعم والمحلات التجارية | الضفة الغربية، فلسطين

Monorepo for the Shu Abalak ordering & delivery platform: 4 mobile apps + a web admin dashboard, backed by a NestJS API. See [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) and [FRONTEND_DESIGN.md](./FRONTEND_DESIGN.md) for the full spec.

## Structure

```
shu-abalak/
├── apps/
│   ├── api/              NestJS + Prisma + PostgreSQL + Redis + Socket.io
│   ├── customer-app/     React Native / Expo (الزبون)
│   ├── business-app/     React Native / Expo (المنشأة)
│   ├── driver-app/       React Native / Expo (السائق)
│   └── admin-dashboard/  Next.js 14 + Tailwind
├── packages/
│   ├── shared-types/     TypeScript interfaces (models, enums, socket events)
│   ├── ui-components/     Design tokens from FRONTEND_DESIGN.md
│   └── utils/            Shared helpers (currency, order-status)
├── docker-compose.yml    Postgres 16 + Redis 7
└── nx.json
```

## Prerequisites

- Node.js >= 20, pnpm 10+
- Docker (for Postgres + Redis)

## Setup

```bash
pnpm install                       # install all workspace deps
pnpm db:up                         # start Postgres + Redis
cp apps/api/.env.example apps/api/.env
pnpm --filter @shu/api prisma:generate
pnpm --filter @shu/api prisma:migrate
pnpm --filter @shu/api prisma:seed   # seeds the West Bank areas
```

## Run

```bash
pnpm api        # NestJS API → http://localhost:3000 (Swagger at /docs)
pnpm admin      # Next.js admin → http://localhost:3000
pnpm customer   # Expo customer app
pnpm business   # Expo business app
pnpm driver     # Expo driver app
```

## Brand

| | |
|---|---|
| Primary | `#E6781E` orange/saffron |
| Secondary | `#165A34` Palestinian green |
| Background | `#FCF3DC` warm cream |
| Arabic font | Cairo |
| Latin font | Montserrat |

Design tokens live in [`packages/ui-components/src/tokens.ts`](./packages/ui-components/src/tokens.ts) — the single source of truth shared by every app.
