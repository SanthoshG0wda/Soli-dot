# syntax=docker/dockerfile:1

# ── Stage 1: Base ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl and pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.5.1

# ── Stage 2: Dependencies ─────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy dependency manifests and pnpm workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Ensure dependencies with lifecycle scripts (esbuild, unrs-resolver) are approved
RUN pnpm approve-builds --all || true

# Install all dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile --prod=false

# ── Stage 3: Builder ──────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application with standalone output
RUN pnpm build

# ── Stage 4: Production Runner ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME="0.0.0.0"
ENV DOTS_DATA_DIR=/app/.data

# Install curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user and group for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Prepare persistent data directories
RUN mkdir -p /app/.data /data && \
    chown -R nextjs:nodejs /app /data

# Copy standalone build output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3100/ || exit 1

CMD ["node", "server.js"]
