#!/bin/bash

#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "Échec du déploiement à la ligne ${LINENO}." >&2' ERR

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
APP_DIR="$(cd -- "$APP_DIR" && pwd -P)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-multi_tenant}"

cd "$APP_DIR"

for cmd in git pnpm node pm2; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Commande requise introuvable : $cmd" >&2
    exit 1
  }
done

echo "Récupération du code..."
git fetch origin "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "Installation des dépendances..."
pnpm install --frozen-lockfile

load_env() {
  node -e 'require("dotenv").config(); const v = process.env[process.argv[1]]; if (v) process.stdout.write(v)' "$1"
}

DATABASE_URL="${DATABASE_URL:-$(load_env DATABASE_URL)}"
GMAO_BACKUP_DIR="${GMAO_BACKUP_DIR:-$(load_env GMAO_BACKUP_DIR)}"
PG_DUMP_BIN="${PG_DUMP_PATH:-$(load_env PG_DUMP_PATH)}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"

if [[ -z "$DATABASE_URL" || -z "$GMAO_BACKUP_DIR" ]]; then
  echo "DATABASE_URL et GMAO_BACKUP_DIR doivent être configurées." >&2
  exit 1
fi

export DATABASE_URL GMAO_BACKUP_DIR

mkdir -p "$GMAO_BACKUP_DIR"
GMAO_BACKUP_DIR="$(cd -- "$GMAO_BACKUP_DIR" && pwd -P)"

case "$GMAO_BACKUP_DIR/" in
  "$APP_DIR/"*)
    echo "Le dossier de sauvegarde doit être hors du projet." >&2
    exit 1
    ;;
esac

command -v "$PG_DUMP_BIN" >/dev/null 2>&1 || {
  echo "pg_dump introuvable : $PG_DUMP_BIN" >&2
  exit 1
}

echo "Génération du client Prisma..."
pnpm prisma generate

echo "Construction de l'application..."
pnpm build

echo "Sauvegarde de la base..."
BACKUP_FILE="$GMAO_BACKUP_DIR/gmao_predeploy_$(date -u +%Y%m%d_%H%M%S).dump"

"$PG_DUMP_BIN" \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"

chmod 600 "$BACKUP_FILE"

echo "Application des migrations..."
pnpm prisma migrate deploy

echo "Redémarrage de PM2..."
pm2 startOrReload "$APP_DIR/ecosystem.config.js" \
  --only "$PM2_APP_NAME" \
  --update-env

pm2 save

echo "Déploiement terminé. Sauvegarde : $BACKUP_FILE"