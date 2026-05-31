#!/bin/sh
# Railway/production entrypoint: apply DB migrations + seed, then start the API.
# Runs from /app/apps/api (WORKDIR). Fails fast if migrations fail.
set -e

echo "→ Applying database migrations (prisma migrate deploy)…"
../../node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "→ Seeding reference data (areas, demo records — idempotent)…"
# Seed is idempotent (upsert/find-or-create). Don't fail the boot if seeding hiccups.
../../node_modules/.bin/ts-node prisma/seed.ts || echo "⚠ seed step reported an issue (continuing)"

echo "→ Starting API…"
exec node dist/main
