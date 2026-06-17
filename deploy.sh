#!/usr/bin/env bash
# Script de deploiement solaupiano
# Usage: ssh toxic@87.106.196.227 'cd /var/www/solaupiano && bash deploy.sh'
#
# Flux attendu:
# 1. coder en local
# 2. commit + push sur origin/main
# 3. lancer ce script sur le serveur pour pull main et redeployer

set -Eeuo pipefail

APP_NAME="solaupiano"
APP_DIR="/var/www/solaupiano"
BRANCH="main"

cd "$APP_DIR"

echo "==> Verification de l'etat Git..."
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "ERREUR: le serveur contient des changements locaux."
  echo "Sauvegarde ou nettoie ces changements avant de deployer:"
  git status --short
  exit 1
fi

echo "==> Mise à jour du code..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Installation des dépendances..."
npm ci

echo "==> Génération du client Prisma..."
npx prisma generate

echo "==> Migrations base de données..."
npx prisma db push

echo "==> Build de production..."
npm run build

echo "==> Redémarrage PM2..."
pm2 restart "$APP_NAME" || pm2 start "$APP_DIR/ecosystem.config.js" --only "$APP_NAME"

echo "==> Sauvegarde de la config PM2..."
pm2 save

echo ""
echo "Deploiement termine sur $(git rev-parse --short HEAD)."
pm2 status "$APP_NAME"
