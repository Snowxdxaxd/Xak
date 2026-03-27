# ─── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install only production deps for the server
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy server sources
COPY server/ ./server/

# Copy env example as fallback (real .env should be mounted or passed via env)
COPY .env.example .env.example

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
