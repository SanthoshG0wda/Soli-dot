# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

# Playwright needs Chromium system libs (installed once, reused in final image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxss1 \
    fonts-liberation \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Install Playwright browser (Chromium only — the agent uses it)
RUN npx playwright install chromium

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY . .

# Build the Next.js app
RUN pnpm build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

# Re-install runtime system libs (Chromium needs them at runtime too)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxss1 \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@12.5.1 --activate

WORKDIR /app

ENV NODE_ENV=production
# Data directory → mount a Dokploy volume here so SQLite + uploads persist across deploys
ENV DOTS_DATA_DIR=/data

# Copy Next.js standalone output (includes its own trimmed node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Playwright browser binaries from deps stage
COPY --from=deps /root/.cache/ms-playwright /root/.cache/ms-playwright

# Create the data directory (will be overridden by volume mount)
RUN mkdir -p /data

EXPOSE 3100

# Health-check so Dokploy / Traefik know when the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3100/ || exit 1

CMD ["node", "server.js"]
