#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Usage: DATABASE_URL=\"postgresql://...\" bash scripts/setup-db.sh"
  exit 1
fi

echo "=== Mitch-Risk database setup ==="
echo ""

echo "Applying migrations..."
npx prisma migrate deploy
echo ""

SEED_MARKER="${SEED_MARKER:-/tmp/mitch-risk-seeded}"
SKIP_SEED="${SKIP_SEED:-false}"

if [ "$SKIP_SEED" = "true" ]; then
  echo "Seed skipped (SKIP_SEED=true)."
elif [ -f "$SEED_MARKER" ]; then
  echo "Seed already applied (marker file exists at $SEED_MARKER)."
else
  echo "Seeding database..."
  npx prisma db seed
  touch "$SEED_MARKER"
  echo "Seed complete."
fi

echo ""
echo "Database is ready. Start the app container with the same DATABASE_URL."
