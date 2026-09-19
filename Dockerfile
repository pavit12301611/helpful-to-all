# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# OpenHub production image.
#
# Multi-stage: dependencies → build → runtime. The runtime stage uses the
# Next.js standalone output plus only the native packages Prisma needs, so the
# image stays small and runs as a non-root user.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A build-time secret is required by Next; the real value is read at runtime.
ARG AUTH_SECRET=build-time-placeholder-not-used-at-runtime
ENV AUTH_SECRET=$AUTH_SECRET
RUN npm run db:generate \
 && npm run build \
 && npm prune --omit=dev

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 openhub \
 && useradd --system --uid 1001 --gid openhub --home /app openhub

COPY --from=build --chown=openhub:openhub /app/.next/standalone ./
COPY --from=build --chown=openhub:openhub /app/.next/static ./.next/static
COPY --from=build --chown=openhub:openhub /app/public ./public
COPY --from=build --chown=openhub:openhub /app/prisma ./prisma
COPY --from=build --chown=openhub:openhub /app/scripts ./scripts
COPY --from=build --chown=openhub:openhub /app/node_modules ./node_modules
COPY --from=build --chown=openhub:openhub /app/package.json ./package.json
RUN mkdir -p /app/storage/uploads && chown -R openhub:openhub /app/storage

USER openhub
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
