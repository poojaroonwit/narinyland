FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ecaf0bd06f5d11a23#nodealpine to understand why libc6-compat might be needed.
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

# Generate Prisma client
RUN npx prisma generate

# Declare build arguments
ARG DATABASE_URL
ARG DIRECT_URL
ARG NEXT_PUBLIC_APPKIT_DOMAIN
ARG NEXT_PUBLIC_APPKIT_CLIENT_ID

# Set environment variables for the build process
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
ENV NEXT_PUBLIC_APPKIT_DOMAIN=${NEXT_PUBLIC_APPKIT_DOMAIN}
ENV NEXT_PUBLIC_APPKIT_CLIENT_ID=${NEXT_PUBLIC_APPKIT_CLIENT_ID}

RUN npm run build

# Install production dependencies
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --create-home --home-dir /home/nextjs -g nodejs nextjs
ENV HOME=/home/nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-production.sh ./scripts/start-production.sh
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# Railway can resume the app before a sleeping Postgres service has finished recovery.
# Retry the migration gate before exposing the Next.js server to health checks or user traffic.
CMD ["sh", "scripts/start-production.sh"]
