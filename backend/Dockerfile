# syntax = docker/dockerfile:1
#
# Production image for the TransmogVault Express backend.
# Two-stage build keeps the final image small: builder layer installs
# everything (incl. dev deps if we ever add a build step) and the runtime
# layer only carries production deps and source.

# ── Stage 1: install dependencies ────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only manifests first so Docker can cache the npm install layer when
# source changes but deps don't.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev


# ── Stage 2: runtime ─────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Drop root for security — Node images already include a `node` user.
ENV NODE_ENV=production
ENV PORT=8080

# Copy installed node_modules and source.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Fly.io expects the listener on the port it injects via $PORT.
EXPOSE 8080

USER node
CMD ["node", "server.js"]
