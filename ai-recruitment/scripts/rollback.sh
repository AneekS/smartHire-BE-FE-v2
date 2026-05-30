#!/bin/sh
# Rollback helper — invoked by CI on failed health check.
# Env: ROLLBACK_MIGRATION_NAME, ACR_IMAGE_PREVIOUS, AZURE_WEBAPP_NAME,
#      AZURE_RESOURCE_GROUP, OPS_SLACK_WEBHOOK_URL
set -e

cd "$(dirname "$0")/.."

echo "[rollback] Rollback triggered at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -n "${ROLLBACK_MIGRATION_NAME:-}" ]; then
  echo "[rollback] Marking migration rolled back: $ROLLBACK_MIGRATION_NAME"
  npx prisma migrate resolve --rolled-back "$ROLLBACK_MIGRATION_NAME" || true
else
  echo "[rollback] ROLLBACK_MIGRATION_NAME not set — skipping prisma migrate resolve"
fi

if [ -n "${ACR_IMAGE_PREVIOUS:-}" ] && [ -n "${AZURE_WEBAPP_NAME:-}" ] && [ -n "${AZURE_RESOURCE_GROUP:-}" ]; then
  echo "[rollback] Redeploying previous container image: $ACR_IMAGE_PREVIOUS"
  az webapp config container set \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --docker-custom-image-name "$ACR_IMAGE_PREVIOUS" \
    || echo "[rollback] WARN: az webapp config container set failed"
  az webapp restart \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    || echo "[rollback] WARN: az webapp restart failed"
else
  echo "[rollback] ACR_IMAGE_PREVIOUS / AZURE_WEBAPP_NAME / AZURE_RESOURCE_GROUP not fully set — skipping image rollback"
fi

MESSAGE="SmartHire deploy rollback triggered.
Migration: ${ROLLBACK_MIGRATION_NAME:-n/a}
Previous image: ${ACR_IMAGE_PREVIOUS:-n/a}
Web app: ${AZURE_WEBAPP_NAME:-n/a}"

if [ -n "${OPS_SLACK_WEBHOOK_URL:-}" ]; then
  curl -sf -X POST "$OPS_SLACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"*[CRITICAL]* $MESSAGE\"}" \
    || echo "[rollback] WARN: Slack webhook failed"
else
  echo "[rollback] OPS_SLACK_WEBHOOK_URL not set — alert logged only"
  echo "$MESSAGE"
fi

echo "[rollback] Complete"
