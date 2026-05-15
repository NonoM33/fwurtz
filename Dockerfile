# syntax=docker/dockerfile:1.7
# Multi-stage build for Maison Fwurtz.
# Stage 1: install + build with Bun (fast, deterministic via bun.lock).
# Stage 2: minimal Node runtime to serve the Astro Node adapter.

ARG BUN_VERSION=1.3.12
ARG NODE_VERSION=22-alpine

FROM oven/bun:${BUN_VERSION}-alpine AS builder
WORKDIR /app

# Native build deps for better-sqlite3 (compiled if no prebuild matches).
RUN apk add --no-cache python3 make g++ libc6-compat

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
    PORT=3000 \
    DB_PATH=/app/data/db.sqlite \
    MEDIA_DIR=/app/data/media

# Build tools to recompile better-sqlite3 against this Node ABI; libstdc++
# stays installed for runtime. The rest of the toolchain is removed after
# the rebuild to keep the final image small.
RUN apk add --no-cache --virtual .build-deps python3 make g++ libc6-compat \
 && apk add --no-cache libstdc++

# Pull only what is needed to run the built server.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# better-sqlite3 was compiled against bun headers in the builder stage and
# crashes on Node with ERR_DLOPEN_FAILED. Recompile it for Node here.
RUN npm rebuild better-sqlite3 --build-from-source \
 && apk del .build-deps

# Persistent data (mount /app/data as a Coolify volume in production).
RUN mkdir -p /app/data/media && \
    addgroup -S app && adduser -S -G app app && \
    chown -R app:app /app

USER app
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "./dist/server/entry.mjs"]
