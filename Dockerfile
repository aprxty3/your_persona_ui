# Multi-stage build — Next.js standalone output executed by Bun (Tech Doc §10).
# Image target <150MB: the runner only carries .next/standalone + static + public.

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time — override via --build-arg in CI.
# NEXT_PUBLIC_API_BASE_URL defaults to the same-origin proxy path (FE-03) — this
# is now a constant across every environment (dev/staging/prod), since the
# actual BE address is supplied separately, at container runtime, via
# API_INTERNAL_URL (docker-compose `environment:` — see docker/*.yml).
ARG NEXT_PUBLIC_API_BASE_URL=/api/be
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs
EXPOSE 3000
# Trivial fallback to node:20-alpine + `node server.js` if a compat issue shows up.
CMD ["bun", "server.js"]
