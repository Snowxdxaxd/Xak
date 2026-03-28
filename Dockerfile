# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first (better layer caching)
COPY package.json package-lock.json ./

# npm ci uses lockfile for reproducible installs.
# npm 7+ auto-installs peer dependencies (React etc.)
RUN npm ci || npm install

# Copy source and build
COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install production server dependencies only
COPY package.json package-lock.json ./

RUN npm ci --omit=dev || npm install --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server/ ./server/

# Ensure uploads directory exists
RUN mkdir -p /app/uploads/thumbnails

EXPOSE 4000

ENV NODE_ENV=production

# Health check — app answers on /api/healthz
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/healthz || exit 1

CMD ["node", "server/index.js"]
