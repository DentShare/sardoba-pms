#!/bin/sh
set -e

echo "==> Running database migrations..."
cd /app/apps/api
node -e "
  const { AppDataSource } = require('./dist/database/data-source');
  AppDataSource.initialize()
    .then(ds => ds.runMigrations())
    .then(() => { console.log('Migrations complete'); process.exit(0); })
    .catch(err => { console.error('Migration failed:', err); process.exit(1); });
"

echo "==> Starting API server..."
exec node /app/apps/api/dist/main.js
