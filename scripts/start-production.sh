#!/bin/sh
set -u

MAX_ATTEMPTS="${DB_STARTUP_MAX_ATTEMPTS:-12}"
attempt=1

while ! npx prisma migrate deploy; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Database migration failed after ${MAX_ATTEMPTS} attempts; refusing to start the app." >&2
    exit 1
  fi

  retry_seconds=$((attempt * 2))
  if [ "$retry_seconds" -gt 10 ]; then
    retry_seconds=10
  fi

  echo "Database not ready; retrying migration in ${retry_seconds}s (attempt ${attempt}/${MAX_ATTEMPTS})." >&2
  sleep "$retry_seconds"
  attempt=$((attempt + 1))
done

echo "Database ready; starting Narinyland."
exec node server.js
