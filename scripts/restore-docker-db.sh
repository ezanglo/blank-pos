#!/usr/bin/env bash
# Restore a Postgres dump into the docker-compose database (service: postgres, DB: blankpos).
#
# Custom (-Fc) / tar (-Ft) archives: copied into the container, then pg_restore.
# Directory format (-Fd): copied into the container, then pg_restore runs on that path.
# Plain SQL (*.sql): piped through psql (pg_restore cannot read plain SQL).
#
# Usage (from repo root, compose stack up):
#   pnpm db:restore ./backup.dump
#   pnpm db:restore ./backup_dir/           # directory-format dump
#   pnpm db:restore ./backup.sql
#   pnpm db:restore ./backup.dump -- --jobs=4   # extra pg_restore flags before stdin/file args
#
# Supabase: dumps include extensions not shipped with vanilla Postgres (e.g. supabase_vault).
#   RESTORE_SUPABASE_LOCAL=1 pnpm db:restore ./backup.dump
# or: pnpm db:restore ./backup.dump -- --exclude-extension=supabase_vault --exclude-schema=vault
# Add more --exclude-extension=… if pg_restore still errors.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  echo "Usage: $0 <dump-file-or-directory> [-- extra pg_restore options]" >&2
  exit 1
}

[[ $# -ge 1 ]] || usage

DUMP="$1"
shift
EXTRA=()
while [[ $# -gt 0 ]]; do
  EXTRA+=("$1")
  shift
done

if [[ "${RESTORE_SUPABASE_LOCAL:-}" == "1" ]]; then
  EXTRA=(--exclude-extension=supabase_vault --exclude-schema=vault "${EXTRA[@]}")
fi

if [[ ! -e "$DUMP" ]]; then
  echo "Not found: $DUMP" >&2
  exit 1
fi

if ! docker compose exec -T postgres pg_isready -U postgres -d blankpos >/dev/null 2>&1; then
  echo "Postgres is not reachable in Docker. Start it from the repo root: docker compose up -d" >&2
  exit 1
fi

restore_psql() {
  docker compose exec -i -T postgres psql -U postgres -d blankpos -v ON_ERROR_STOP=1 <"$1"
}

restore_pg_restore_stdin() {
  local remote status
  remote="/tmp/pg_restore_archive_$$"
  docker compose cp "$1" "postgres:${remote}"
  status=0
  if [[ ${#EXTRA[@]} -eq 0 ]]; then
    docker compose exec -T postgres pg_restore -U postgres -d blankpos \
      --clean --if-exists --no-owner --no-acl "${remote}" || status=$?
  else
    docker compose exec -T postgres pg_restore -U postgres -d blankpos \
      --clean --if-exists --no-owner --no-acl \
      "${EXTRA[@]}" "${remote}" || status=$?
  fi
  docker compose exec -T postgres rm -f "${remote}" >/dev/null 2>&1 || true
  return "$status"
}

restore_pg_restore_dir() {
  local src tmp
  src="$(cd "$1" && pwd)"
  tmp="/tmp/pg_restore_dir_$$"
  docker compose exec -T postgres mkdir -p "${tmp}"
  docker compose cp "${src}/." "postgres:${tmp}/"
  if [[ ${#EXTRA[@]} -eq 0 ]]; then
    docker compose exec -T postgres pg_restore -U postgres -d blankpos \
      --clean --if-exists --no-owner --no-acl "${tmp}"
  else
    docker compose exec -T postgres pg_restore -U postgres -d blankpos \
      --clean --if-exists --no-owner --no-acl \
      "${EXTRA[@]}" "${tmp}"
  fi
  docker compose exec -T postgres rm -rf "${tmp}"
}

if [[ -d "$DUMP" ]]; then
  restore_pg_restore_dir "$DUMP"
elif [[ "${DUMP##*.}" == sql ]] || [[ "${DUMP##*.}" == SQL ]]; then
  restore_psql "$DUMP"
else
  restore_pg_restore_stdin "$DUMP"
fi

echo "Restore finished."
