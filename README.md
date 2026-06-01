# شو عبالك؟ — Shu Abalak

> **Multi-app food & store delivery platform for the West Bank** — connecting customers, businesses, and drivers in real time.

<!-- 🔗 Live demo: [add demo link here] -->

## Overview

**Shu Abalak** ("شو عبالك؟" — *"What are you craving?"*) is a full-stack delivery platform built for the West Bank market. It links three sides of a local delivery economy — **customers** ordering from restaurants and stores, **businesses** managing their menus and incoming orders, and **drivers** fulfilling deliveries — coordinated by a central API and an **admin control center**. The platform is Arabic-first (RTL) and designed for the realities of local commerce: area-based catalogs, multi-category businesses, and live order tracking.

## Tech Stack

![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socketdotio&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

- **Backend:** NestJS (TypeScript), PostgreSQL + Prisma ORM, Redis, Socket.io
- **Mobile:** React Native / Expo (customer, business, driver apps)
- **Web:** Next.js + Tailwind CSS (admin dashboard)
- **Infrastructure:** Docker, deployed on **Railway** (API + database) and **Vercel** (dashboard)
- **Push:** Firebase Cloud Messaging (FCM)

## Architecture

A **pnpm + Nx monorepo** with four clients and one shared API:

```
shu-abalak/
├── apps/
│   ├── api/              NestJS + Prisma + PostgreSQL + Redis + Socket.io
│   ├── customer-app/     React Native / Expo  — browse & order
│   ├── business-app/     React Native / Expo  — manage menu & orders
│   ├── driver-app/       React Native / Expo  — accept & deliver
│   └── admin-dashboard/  Next.js + Tailwind   — control center
└── packages/
    ├── shared-types/     Shared TypeScript models, enums & socket events
    ├── ui-components/     Design tokens & shared UI
    └── utils/            Shared helpers (currency, order-status)
```

Shared TypeScript types keep the API, apps, and dashboard in lockstep on models, enums, and real-time socket events.

## Key Features

- **Real-time order tracking** — live order status and driver updates over Socket.io.
- **Guarded order state machine** — order transitions are validated server-side, so an order can only move through allowed states.
- **Role-based JWT authentication** — distinct customer / business / driver / admin roles with guarded routes.
- **Push notifications** — Firebase Cloud Messaging across all client apps, with in-app notification lists and audible alerts.
- **Admin control center** — verify businesses and drivers, oversee orders, and manage the platform from a Next.js dashboard.
- **Multi-tag business categorization** — businesses can belong to multiple categories for flexible discovery.
- **Area-based catalogs** — content scoped to delivery areas across the West Bank.

## Screenshots

<!-- [add screenshot here — customer app: browse & order] -->
<!-- [add screenshot here — business app: order management] -->
<!-- [add screenshot here — driver app: active delivery] -->
<!-- [add screenshot here — admin dashboard] -->

## Getting Started

**Prerequisites:** Node.js ≥ 20, pnpm 10+, Docker (for Postgres + Redis).

```bash
pnpm install                          # install all workspace deps
pnpm db:up                            # start Postgres + Redis via Docker
cp apps/api/.env.example apps/api/.env  # then fill in your own values
pnpm --filter @shu/api prisma:generate
pnpm --filter @shu/api prisma:migrate
pnpm --filter @shu/api prisma:seed
```

Run a target:

```bash
pnpm api        # NestJS API (Swagger at /docs)
pnpm admin      # Next.js admin dashboard
pnpm customer   # Expo customer app
pnpm business   # Expo business app
pnpm driver     # Expo driver app
```

## Built with AI-assisted development

This project was built with **AI-assisted development using [Claude Code](https://claude.com/claude-code)** — used for architecture exploration, implementation, and code review throughout. Treating AI as a force multiplier while owning the design decisions and final quality bar was a core part of the workflow.

## License

This repository is part of a personal portfolio. All rights reserved.
