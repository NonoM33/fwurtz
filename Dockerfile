# syntax=docker/dockerfile:1.7
# Multi-stage build for Maison Fwurtz.
# Stage 1: install + build with Bun (fast, deterministic via bun.lock).
# Stage 2: minimal Node runtime to serve the Astro Node adapter.

ARG BUN_VERSION=1.3.12
ARG NODE_VERSION=22-alpine

FROM oven/bun:${BUN_VERSION}-alpine AS builder
WORKDIR /app

# Install deps with cached layer (only invalidated when manifests change).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Bring the rest of the source in and build.
COPY tsconfig.json astro.config.mjs ./
COPY src ./src
COPY public ./public
RUN bun run build


FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Pull only what is needed to run the built server.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Drop root for runtime safety.
RUN addgroup -S app && adduser -S -G app app && chown -R app:app /app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "./dist/server/entry.mjs"]
