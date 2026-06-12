#!/bin/bash
# Script de déploiement solaupiano
# Usage : bash deploy.sh  (exécuté en root depuis le serveur)
# Le build et le restart PM2 tournent en tant que l'utilisateur 'toxic'
# pour éviter tout problème de permissions sur .next et node_modules.

set -e

APP_NAME="solaupiano"
APP_DIR="/var/www/solaupiano"
APP_USER="toxic"

echo "==> Mise à jour du code..."
git -C "$APP_DIR" pull origin main

echo "==> Correction des permissions..."
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "==> Installation des dépendances..."
su - "$APP_USER" -c "cd $APP_DIR && npm ci --omit=dev"

echo "==> Génération du client Prisma..."
su - "$APP_USER" -c "cd $APP_DIR && npx prisma generate"

echo "==> Migrations base de données..."
su - "$APP_USER" -c "cd $APP_DIR && npx prisma db push"

echo "==> Build de production..."
su - "$APP_USER" -c "cd $APP_DIR && npm run build"

echo "==> Redémarrage PM2..."
su - "$APP_USER" -c "pm2 restart $APP_NAME || pm2 start $APP_DIR/ecosystem.config.js"

echo "==> Sauvegarde de la config PM2..."
su - "$APP_USER" -c "pm2 save"

echo ""
echo "Déploiement terminé."
su - "$APP_USER" -c "pm2 status $APP_NAME"
