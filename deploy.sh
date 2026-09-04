#!/usr/bin/env bash
# Deploy worker.js to Cloudflare Workers via the REST API (no wrangler/node needed).
#
# One-time setup: create ./.cloudflare.env next to this script containing:
#   CLOUDFLARE_API_TOKEN=...    # dash.cloudflare.com -> My Profile -> API Tokens
#                               # -> Create Token -> "Edit Cloudflare Workers" template
#   CLOUDFLARE_ACCOUNT_ID=...   # dash.cloudflare.com -> Workers & Pages (right sidebar)
#
# Then:  ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

SCRIPT_NAME="priceline-expedia-dashboard"
API="https://api.cloudflare.com/client/v4"

[ -f .cloudflare.env ] && source .cloudflare.env
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN in .cloudflare.env}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID in .cloudflare.env}"
[ -f worker.js ] || { echo "worker.js missing — run: python3 build_worker.py"; exit 1; }

auth=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

echo "Uploading $SCRIPT_NAME…"
upload=$(curl -s -X PUT "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME" \
  "${auth[@]}" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2025-01-01"};type=application/json' \
  -F 'worker.js=@worker.js;type=application/javascript+module')
echo "$upload" | grep -q '"success": *true' || { echo "Upload failed:"; echo "$upload"; exit 1; }
echo "Uploaded."

echo "Enabling workers.dev URL…"
curl -s -X POST "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME/subdomain" \
  "${auth[@]}" -H "Content-Type: application/json" \
  -d '{"enabled":true,"previews_enabled":false}' > /dev/null

subdomain=$(curl -s "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" "${auth[@]}" \
  | sed -n 's/.*"subdomain": *"\([^"]*\)".*/\1/p')
if [ -n "$subdomain" ]; then
  echo
  echo "Live at: https://$SCRIPT_NAME.$subdomain.workers.dev"
else
  echo "Deployed. Find the URL under Workers & Pages -> $SCRIPT_NAME in the Cloudflare dashboard."
fi
