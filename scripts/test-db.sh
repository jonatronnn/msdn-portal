#!/usr/bin/env bash
# Applies the migrations to a throwaway Postgres and runs the access-rule tests.
# Needs the Postgres server binaries (initdb, pg_ctl) on PATH or in PG_BIN.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
DATA="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"

# Postgres refuses to run as root, so use the postgres user when we are root.
if [ "$(id -u)" = 0 ]; then
  chown -R postgres "$DATA"
  run() { su postgres -c "$*"; }
else
  run() { bash -c "$*"; }
fi

cleanup() { run "'$PG_BIN/pg_ctl' -D '$DATA' -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

run "'$PG_BIN/initdb' -D '$DATA' -U postgres -A trust" >/dev/null
run "'$PG_BIN/pg_ctl' -D '$DATA' -o '-p $PORT -k /tmp -c listen_addresses=' -w start" >/dev/null

PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -o /dev/null -f "$ROOT/supabase/tests/access_rules.sql"
echo "Database tests passed"
