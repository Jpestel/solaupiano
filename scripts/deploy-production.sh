#!/usr/bin/env bash
# Lanceur local de deploiement production.
# Usage: bash scripts/deploy-production.sh

set -Eeuo pipefail

BRANCH="main"
REMOTE="origin"
DEPLOY_HOST="${DEPLOY_HOST:-toxic@87.106.196.227}"
APP_DIR="${APP_DIR:-/var/www/solaupiano}"

echo "==> Verification de la branche locale..."
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "$BRANCH" ]; then
  echo "ERREUR: tu es sur '$current_branch'. Passe sur '$BRANCH' avant de deployer."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "ERREUR: le repo local contient des changements non commités."
  git status --short
  exit 1
fi

echo "==> Verification de origin/$BRANCH..."
git fetch "$REMOTE" "$BRANCH"

local_head="$(git rev-parse "$BRANCH")"
remote_head="$(git rev-parse "$REMOTE/$BRANCH")"
base_head="$(git merge-base "$BRANCH" "$REMOTE/$BRANCH")"

if [ "$local_head" = "$remote_head" ]; then
  echo "Local et GitHub sont deja alignes."
elif [ "$base_head" = "$remote_head" ]; then
  echo "==> Push de $BRANCH vers GitHub..."
  git push "$REMOTE" "$BRANCH"
else
  echo "ERREUR: origin/$BRANCH contient des commits absents localement."
  echo "Lance d'abord: git pull --ff-only $REMOTE $BRANCH"
  exit 1
fi

echo "==> Deploiement serveur depuis $REMOTE/$BRANCH..."
ssh "$DEPLOY_HOST" "cd '$APP_DIR' && bash deploy.sh"
