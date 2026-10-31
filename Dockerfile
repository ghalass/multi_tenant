
# --------------------------------------------------
# Base commune
# --------------------------------------------------
FROM node:24-bookworm-slim AS base

WORKDIR /app

RUN corepack enable \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# Installation des dépendances
# --------------------------------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# --------------------------------------------------
# Construction Next.js
# --------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://gmao_docker:docker_local_password@db:5432/gmao_docker?schema=public"
ENV SESSION_PASSWORD="docker-build-session-password-12345678901234567890"
ENV SUPER_ADMIN_SETUP_TOKEN="docker-build-token"

RUN pnpm prisma generate
RUN pnpm build

# --------------------------------------------------
# Image de production
# --------------------------------------------------
FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Installation OpenSSL et des outils PostgreSQL 18
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        openssl \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Utilisateur non privilégié
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Application Next.js standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Dossier des sauvegardes
RUN mkdir -p /backups \
    && chown nextjs:nodejs /backups

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
