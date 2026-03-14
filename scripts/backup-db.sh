#!/bin/bash
# ============================================================
# Sardoba PMS — Database Backup Script
# Usage: ./scripts/backup-db.sh
# Requires: SUPABASE_DB_URL or DATABASE_URL env variable
# ============================================================

set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sardoba_${TIMESTAMP}.sql.gz"

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "ERROR: Set SUPABASE_DB_URL or DATABASE_URL environment variable"
  echo "Example: export SUPABASE_DB_URL='postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "==> Creating backup: $BACKUP_FILE"
pg_dump "$DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "==> Backup complete: $BACKUP_FILE ($SIZE)"

# Keep only last 10 backups
ls -t "${BACKUP_DIR}"/sardoba_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
echo "==> Old backups cleaned (keeping last 10)"
