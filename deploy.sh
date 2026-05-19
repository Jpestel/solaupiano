#!/bin/bash
# Script de déploiement solaupiano
# Usage : bash deploy.sh
# À exécuter depuis /var/www/solaupiano sur le serveur

set -e

APP_NAME="solaupiano"

echo "==> Mise à jour du code..."
git pull origin main

echo "==> Installation des dépendances..."
npm ci --omit=dev

echo "==> Génération du client Prisma..."
npx prisma generate

echo "==> Migrations base de données..."
npx prisma db push

echo "==> Build de production..."
npm run build

echo "==> Redémarrage PM2..."
pm2 restart $APP_NAME || pm2 start ecosystem.config.js

echo "==> Sauvegarde de la config PM2..."
pm2 save

echo ""
echo "Déploiement terminé."
pm2 status $APP_NAME
