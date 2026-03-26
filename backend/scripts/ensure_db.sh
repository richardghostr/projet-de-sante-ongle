#!/bin/sh

# POSIX-safe script to ensure database schema exists.
# Normalized to LF line endings to avoid /bin/sh parsing issues on Windows-hosted repos.
set -e

# Wait for DB to be reachable
echo "Waiting for database ${DB_HOST:-db}:${DB_PORT:-3306}..."
# disable SSL when connecting from container to avoid SSL negotiation failures in some environments
until mysql --ssl=FALSE -h "${DB_HOST:-db}" -P "${DB_PORT:-3306}" -u"${DB_USER:-uh_user}" -p"${DB_PASS:-uh_pass}" -e "SELECT 1" "${DB_NAME:-unguealhealth}" >/dev/null 2>&1; do
  sleep 1
done

# Check for a core table (users) and import schema if missing
HAS_USERS=$(mysql --ssl=FALSE -h "${DB_HOST:-db}" -P "${DB_PORT:-3306}" -u"${DB_USER:-uh_user}" -p"${DB_PASS:-uh_pass}" -N -s -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME:-unguealhealth}' AND table_name='users';")

if [ "${HAS_USERS:-0}" -eq 0 ]; then
  echo "Schema not found — importing ${PWD}/database_init.sql into ${DB_NAME:-unguealhealth}"
  mysql --ssl=FALSE -h "${DB_HOST:-db}" -P "${DB_PORT:-3306}" -u"${DB_USER:-uh_user}" -p"${DB_PASS:-uh_pass}" "${DB_NAME:-unguealhealth}" < "${PWD}/database_init.sql"
  echo "Schema import completed"
else
  echo "Schema already present"
fi

exit 0
