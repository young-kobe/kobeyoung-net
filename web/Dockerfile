# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# The build reads the shared API contract from ../packages, so copy both.
COPY web/package.json web/package-lock.json ./web/
COPY packages ./packages
WORKDIR /app/web
RUN npm ci

COPY web ./
COPY packages /app/packages

# NEXT_PUBLIC_* must be present at build time (they're inlined into the client bundle).
# BUILD_SHA / BUILD_TIME feed the live dashboard's "deployed" tile (public, not secret).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_BUILD_SHA
ARG NEXT_PUBLIC_BUILD_TIME
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_BUILD_SHA=$NEXT_PUBLIC_BUILD_SHA \
    NEXT_PUBLIC_BUILD_TIME=$NEXT_PUBLIC_BUILD_TIME \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
# `output: standalone` produces a minimal self-contained server.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# Run as non-root.
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./.next/static
COPY --from=build /app/web/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
