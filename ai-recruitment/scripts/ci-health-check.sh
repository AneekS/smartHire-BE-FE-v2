#!/bin/sh
# CI health gate: curl /api/health up to 3 times with 10s delay.
set -e

BASE_URL="${1:-https://${AZURE_WEBAPP_NAME}.azurewebsites.net}"
HEALTH_URL="${BASE_URL%/}/api/health"
MAX_ATTEMPTS="${HEALTH_CHECK_ATTEMPTS:-3}"
DELAY_SEC="${HEALTH_CHECK_DELAY_SEC:-10}"

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "[health-check] Attempt $attempt/$MAX_ATTEMPTS: $HEALTH_URL"
  if response=$(curl -sf "$HEALTH_URL"); then
    if echo "$response" | grep -q '"ok":true'; then
      echo "[health-check] OK"
      exit 0
    fi
    echo "[health-check] Response missing ok:true: $response"
  else
    echo "[health-check] Request failed"
  fi
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$DELAY_SEC"
  fi
  attempt=$((attempt + 1))
done

echo "[health-check] FAILED after $MAX_ATTEMPTS attempts"
exit 1
