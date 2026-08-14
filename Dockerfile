# =============================================================
# Edutopia — single image: React (TanStack Start, static build)
# + Node/Express backend. Place this file at the REPO ROOT
# (same level as /backend and /frontend).
# =============================================================

# ---------- Stage 1: build the frontend ----------------------
FROM oven/bun:1 AS frontend-build
WORKDIR /app/frontend

# Install deps first (better layer caching)
COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install --frozen-lockfile

# Build
COPY frontend/ ./
RUN bun run build
# NOTE: Vite's default output dir is `dist/`. If your vite.config.ts
# sets build.outDir to something else, change the COPY path in Stage 3.

# ---------- Stage 2: install backend prod deps ----------------
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ---------- Stage 3: final runtime image -----------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

# Backend code + prod-only node_modules
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# Built frontend, served as static files by the backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Uploads dir must exist and be writable (also mounted as a volume, see compose)
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend
EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/app.js"]
