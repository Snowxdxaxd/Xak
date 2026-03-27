# ─── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Use npm install so new deps in package.json are picked up automatically
RUN npm install --frozen-lockfile || npm install

COPY . .

# Build the Vite frontend
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install only production deps for the server
COPY package*.json ./
RUN npm install --omit=dev || npm install --omit=dev --ignore-scripts

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy server sources
COPY server/ ./server/

# Copy env example as fallback (real .env should be mounted or passed via env)
COPY .env.example .env.example

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
