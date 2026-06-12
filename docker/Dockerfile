# syntax=docker/dockerfile:1.4

# ----------------------------------------------------------
# Dev target — hot reload, bind mounts
# ----------------------------------------------------------
FROM node:24-alpine AS dev
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY shared/package.json shared/
RUN pnpm install
COPY server/ server/
COPY shared/ shared/
EXPOSE 3010
CMD ["pnpm", "--filter", "sparky-bloom-server", "exec", "tsx", "SparkyFitnessServer.ts"]

# ----------------------------------------------------------
# Production target — immutable image for stage/prod
# ----------------------------------------------------------
FROM node:24-alpine AS production
RUN corepack enable
WORKDIR /app
# Copy only what we need for the server
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY shared/package.json shared/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY server/ server/
COPY shared/ shared/
# Build TypeScript (uncomment when ready)
# RUN cd server && pnpm run build
EXPOSE 3010
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD ["curl", "-f", "http://127.0.0.1:3010/api/ping"]
CMD ["pnpm", "--filter", "sparky-bloom-server", "exec", "tsx", "SparkyFitnessServer.ts"]