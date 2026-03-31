#!/bin/bash
# SP-IssuerApplication Deployment Script
# Run this after authenticating with: npx wrangler login

set -e

echo "=== SyndicatePath Issuer Application Deployment ==="

# 1. Create D1 database
echo ""
echo "Step 1: Creating D1 database..."
DB_OUTPUT=$(npx wrangler d1 create sp-issuer-readiness-db 2>&1)
echo "$DB_OUTPUT"

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}')
if [ -n "$DB_ID" ]; then
    echo ""
    echo "Database ID: $DB_ID"
    echo "Updating wrangler.toml..."
    sed -i "s/placeholder-create-via-wrangler/$DB_ID/" wrangler.toml
    echo "Updated wrangler.toml with database ID"
else
    echo "Could not extract database ID. Update wrangler.toml manually."
fi

# 2. Run migrations
echo ""
echo "Step 2: Running database migrations..."
npx wrangler d1 execute sp-issuer-readiness-db --file=migrations/0001_initial_schema.sql

# 3. Set secrets
echo ""
echo "Step 3: Setting secrets..."
echo "You will be prompted for each secret value."
echo ""

echo "Enter SESSION_SECRET (random 32+ char string):"
npx wrangler secret put SESSION_SECRET

echo ""
echo "Enter N8N_WEBHOOK_URL (your n8n webhook endpoint):"
npx wrangler secret put N8N_WEBHOOK_URL

echo ""
echo "Enter N8N_WEBHOOK_SECRET (shared secret for webhook auth):"
npx wrangler secret put N8N_WEBHOOK_SECRET

# 4. Build and deploy
echo ""
echo "Step 4: Building..."
npm run build

echo ""
echo "Step 5: Deploying to Cloudflare Pages..."
npx wrangler pages deploy .svelte-kit/cloudflare

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "  1. Set up custom domain: readiness.syndicatepath.com"
echo "     - In Cloudflare Dashboard > Pages > sp-issuer-readiness > Custom domains"
echo "     - Or: npx wrangler pages project update sp-issuer-readiness --custom-domain readiness.syndicatepath.com"
echo "  2. Verify the app at your deployment URL"
echo "  3. Set up GHL custom fields (see below)"
