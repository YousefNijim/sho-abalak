# Stage 1: Build environment
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10

# Copy workspace configs and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json nx.json ./

# Copy all packages package.json files to install dependencies in isolated layers
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/api/package.json ./apps/api/

# Install build dependencies
RUN pnpm install --frozen-lockfile

# Copy codebase
COPY . .

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Compile topological monorepo dependencies and NestJS
WORKDIR /app
RUN pnpm --filter @shu/shared-types build
RUN pnpm --filter @shu/utils build
RUN pnpm --filter @shu/api build

# Stage 2: Runner container
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@10

ENV NODE_ENV=production

# Copy built workspaces and prisma schema bindings
COPY --from=builder /app/pnpm-lock.yaml /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/main"]
