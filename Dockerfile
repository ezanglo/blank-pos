# -----------------------------------------------------------------------------
# deps — install dependencies (cached when package.json / lockfile unchanged)
# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder — Next.js production build (standalone output)
# -----------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

ENV NEXT_TELEMETRY_DISABLED=1
# No DATABASE_URL / secrets in image build (.env.docker is dockerignored); matches CI.
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

# -----------------------------------------------------------------------------
# migration — one-shot Drizzle migrations (same schema as CI / host CLI)
# -----------------------------------------------------------------------------
FROM deps AS migration
WORKDIR /app
COPY . .
ENTRYPOINT ["sh", "-c", "if [ \"$${SKIP_DB_MIGRATE:-}\" = \"1\" ]; then exit 0; fi; exec pnpm exec drizzle-kit migrate"]

# -----------------------------------------------------------------------------
# runner — Next standalone server only
# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
