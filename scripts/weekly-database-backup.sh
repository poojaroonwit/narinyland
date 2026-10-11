#!/usr/bin/env bash
# Independent Railway Cron task: ensures a weekly logical restore point even
# when the Postgres service has been sleeping since the last visitor.
set -Eeuo pipefail

required=(PGHOST PGUSER PGPASSWORD PGDATABASE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY BACKUP_BUCKET BACKUP_ENDPOINT)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required backup configuration: $name" >&2
    exit 2
  fi
done

export PGPORT="${PGPORT:-5432}"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
export AWS_EC2_METADATA_DISABLED=true

case "$BACKUP_ENDPOINT" in
  https://*|http://*) endpoint="$BACKUP_ENDPOINT" ;;
  *) endpoint="https://$BACKUP_ENDPOINT" ;;
esac

# Isolate these logical dumps from pgBackRest's WAL/base-backup repository.
# This is intentionally fixed to prevent accidentally pruning unrelated S3 data.
prefix='narinyland/weekly-logical/'
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
key="${prefix}${stamp}.pgdump"

# Opening a connection to a sleeping Railway Postgres service wakes it. Allow
# time for the container's existing-volume mount and crash recovery.
ready=0
for ((attempt=1;attempt<=36;attempt++)); do
  if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q; then
    ready=1
    break
  fi
  sleep 5
done
if [[ "$ready" -ne 1 ]]; then
  echo "Database did not become ready during weekly backup startup" >&2
  exit 1
fi

# A pg_dump custom archive has built-in compression and can be restored with
# pg_restore. Stream it to S3: no extra persistent disk or plaintext dump.
echo "Starting weekly PostgreSQL logical backup: $key"
pg_dump --format=custom --compress=6 --no-owner --no-acl \
  -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  | aws --region "$AWS_DEFAULT_REGION" --endpoint-url "$endpoint" s3 cp - \
      "s3://${BACKUP_BUCKET}/${key}" --only-show-errors

# Verify the object exists before any retention action.
size="$(aws --region "$AWS_DEFAULT_REGION" --endpoint-url "$endpoint" \
  s3api head-object --bucket "$BACKUP_BUCKET" --key "$key" \
  --query ContentLength --output text)"
if [[ ! "$size" =~ ^[0-9]+$ ]] || ((size < 256)); then
  echo "Uploaded dump failed S3 size verification" >&2
  exit 1
fi
echo "Weekly backup uploaded and verified (${size} bytes)"

# Keep four successful, time-stamped dumps. This filter NEVER matches the
# unrelated pgBackRest archives in this bucket.
listing="$(aws --region "$AWS_DEFAULT_REGION" --endpoint-url "$endpoint" \
  s3api list-objects-v2 --bucket "$BACKUP_BUCKET" --prefix "$prefix" \
  --query 'Contents[].Key' --output text)"
objects=()
while IFS= read -r candidate; do
  if [[ "$candidate" =~ ^narinyland/weekly-logical/[0-9]{8}T[0-9]{6}Z\.pgdump$ ]]; then
    objects+=("$candidate")
  fi
done < <(printf '%s\n' "$listing" | tr '\t' '\n' | sort -r)

if ((${#objects[@]} > 4)); then
  for old in "${objects[@]:4}"; do
    aws --region "$AWS_DEFAULT_REGION" --endpoint-url "$endpoint" \
      s3api delete-object --bucket "$BACKUP_BUCKET" --key "$old" >/dev/null
    echo "Expired old weekly dump: $old"
  done
fi

echo "Weekly backup completed successfully"
