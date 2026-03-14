#!/bin/bash
# ============================================================
# Sardoba PMS — Database Restore Script
# Usage: ./scripts/restore-db.sh backups/sardoba_20260314_120000.sql.gz
# ============================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh backups/sardoba_*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
  exit 1
fi

BACKUP_FILE="$1"
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "ERROR: Set SUPABASE_DB_URL or DATABASE_URL environment variable"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will REPLACE all data in the database!"
echo "Restoring from: $BACKUP_FILE"
echo ""
read -p "Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

echo "==> Restoring database..."
gunzip -c "$BACKUP_FILE" | psql "$DB_URL" --single-transaction

echo "==> Restore complete!"
