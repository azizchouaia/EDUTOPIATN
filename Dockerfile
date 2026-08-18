# =============================================================
# Edutopia — two runtime images: backend (Express) + frontend (Workers via wrangler)
# =============================================================

# ---------- Stage 1: build the frontend ----------------------
FROM oven/bun:1 AS frontend-build
WORKDIR /app/frontend

ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install --frozen-lockfile

COPY frontend/ ./
RUN bun run build
# ---------- Stage 2: install backend prod deps ----------------
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
RUN apk add --no-cache python3 make g++
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ---------- Stage 3a: backend runtime image -------------------
FROM node:20-alpine AS backend-runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
RUN mkdir -p /app/backend/uploads
WORKDIR /app/backend
EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/app.js"]

# ---------- Stage 3b: frontend runtime image (needs glibc for workerd) --
FROM node:20-bookworm-slim AS frontend-runtime
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app/frontend
COPY --from=frontend-build /app/frontend/dist ./dist
RUN npm install --no-save wrangler@4
WORKDIR /app/frontend/dist/server
EXPOSE 8787
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npx", "wrangler", "dev", "--port", "8787", "--ip", "0.0.0.0", "--config", "wrangler.json"]
