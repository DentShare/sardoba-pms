#!/bin/bash
# ============================================================
# Sardoba PMS — Seed demo data for hotel beta testing
# Usage: DATABASE_URL='...' ./scripts/seed-demo.sh
# ============================================================

set -euo pipefail

DB_URL="${DATABASE_URL:-}"

if [ -z "$DB_URL" ]; then
  echo "ERROR: Set DATABASE_URL environment variable"
  exit 1
fi

echo "==> Running migrations..."
cd apps/api
npx typeorm migration:run -d dist/database/data-source.js

echo "==> Seeding demo data..."
node -e "
  require('dotenv').config();
  require('./dist/database/seeds/seed-demo.js')
    .then(() => { console.log('Demo seed complete'); process.exit(0); })
    .catch(err => { console.error('Seed failed:', err); process.exit(1); });
"

echo "==> Demo setup complete!"
echo ""
echo "Login credentials:"
echo "  Admin:       admin@sardoba.uz / Admin123!"
echo "  Reception:   reception@sardoba.uz / Reception123!"
echo ""
echo "Public booking: /book/sardoba-guest-house"
