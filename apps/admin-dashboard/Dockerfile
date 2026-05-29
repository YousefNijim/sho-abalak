# Stage 1: Build environment
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10

# Copy workspace configuration and locks
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json nx.json ./

# Copy all packages package.json files
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/

# Install build dependencies
RUN pnpm install --frozen-lockfile

# Copy codebase
COPY . .

# Build shared utilities first
RUN pnpm --filter @shu/shared-types build
RUN pnpm --filter @shu/utils build
RUN pnpm --filter @shu/api-client build

# Build Next.js Dashboard
WORKDIR /app/apps/admin-dashboard
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Stage 2: Runner container
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@10

ENV NODE_ENV=production
ENV PORT=3000

# Copy Next.js compilation files and static assets
COPY --from=builder /app/pnpm-lock.yaml /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/admin-dashboard /app/apps/admin-dashboard
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 3000

WORKDIR /app/apps/admin-dashboard
CMD ["pnpm", "start"]
