# --- deps: install ALL dependencies (incl. dev) so build has Tailwind/PostCSS/etc.
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- builder: compile the Next.js app (App Router) -> output: 'standalone'
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: minimal runtime with only built pieces at FS root
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone server (contains server.js + the runtime node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy compiled static assets
COPY --from=builder /app/.next/static ./.next/static
# If your project later adds a /public folder, uncomment the next line:
# COPY --from=builder /app/public ./public

# Safety: ensure static dir exists (no-op if already copied)
RUN mkdir -p .next/static

# Optional: prune dev deps (usually already prod-only in standalone)
RUN npm prune --omit=dev || true

EXPOSE 3000
CMD ["node", "server.js"]
