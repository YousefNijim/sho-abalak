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

# Enable hoisting so binaries (prisma, tsc) are available at root node_modules/.bin
RUN echo "shamefully-hoist=true" > .npmrc

# Install build dependencies
RUN pnpm install --frozen-lockfile

# Copy codebase
COPY . .

# Generate Prisma Client
RUN ./node_modules/.bin/prisma generate --schema=./apps/api/prisma/schema.prisma

# Compile topological monorepo dependencies and NestJS
RUN cd packages/shared-types && ../../node_modules/.bin/tsc -p tsconfig.build.json
RUN cd packages/utils && ../../node_modules/.bin/tsc -p tsconfig.build.json
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

# Railway provides $PORT at runtime; main.ts listens on it (falls back to 3000).
EXPOSE 3001

WORKDIR /app/apps/api

# Entrypoint runs migrations + seed, then starts the API.
COPY --from=builder /app/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
