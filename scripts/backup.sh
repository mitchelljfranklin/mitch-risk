#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_USER="${DB_USER:-mitch}"
DB_NAME="${DB_NAME:-mitch_risk}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

FILENAME="${BACKUP_DIR}/mitch_risk_${TIMESTAMP}.sql.gz"

echo "Backing up $DB_NAME to $FILENAME ..."
PGPASSWORD="${PGPASSWORD:-mitch}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip > "$FILENAME"

echo "Done: $FILENAME ($(du -h "$FILENAME" | cut -f1))"

# Keep last 7 daily backups
find "$BACKUP_DIR" -name "mitch_risk_*.sql.gz" -type f | sort -r | tail -n +8 | xargs rm -f 2>/dev/null || true
