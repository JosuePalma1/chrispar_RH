#!/usr/bin/env bash
set -euo pipefail

PRIMARY_HOST="${PRIMARY_HOST:-postgres_primary}"
MIRROR_HOST="${MIRROR_HOST:-postgres_mirror}"
DB_NAME="${DB_NAME:-chrispar}"
REPL_USER="${REPL_USER:-replicator}"
REPL_PASSWORD="${REPL_PASSWORD:-replicatorpass}"
PUBLICATION_NAME="${PUBLICATION_NAME:-chrispar_pub}"
SUBSCRIPTION_NAME="${SUBSCRIPTION_NAME:-chrispar_sub}"
SLOT_NAME="${SLOT_NAME:-chrispar_slot}"

echo "Waiting for primary Postgres (${PRIMARY_HOST})..."
until pg_isready -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" >/dev/null 2>&1; do
  sleep 1
done

echo "Waiting for mirror Postgres (${MIRROR_HOST})..."
until pg_isready -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" >/dev/null 2>&1; do
  sleep 1
done

echo "Configuring publication + replication user on primary..."
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${REPL_USER}') THEN
    CREATE ROLE ${REPL_USER} WITH LOGIN REPLICATION PASSWORD '${REPL_PASSWORD}';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE ${DB_NAME} TO ${REPL_USER};
GRANT USAGE ON SCHEMA public TO ${REPL_USER};
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${REPL_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${REPL_USER};

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='${PUBLICATION_NAME}') THEN
    CREATE PUBLICATION ${PUBLICATION_NAME} FOR ALL TABLES;
  END IF;
END
\$\$;
SQL

echo "Configuring subscription on mirror..."
PRIMARY_CONNINFO="host=${PRIMARY_HOST} port=5432 dbname=${DB_NAME} user=${REPL_USER} password=${REPL_PASSWORD}"

PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
-- DROP SUBSCRIPTION cannot run inside a DO block (transaction). Run directly:
DROP SUBSCRIPTION IF EXISTS ${SUBSCRIPTION_NAME};
SQL

echo "Wiping mirror tables (public) to avoid initial copy conflicts..."
PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<'SQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'alembic_version'
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', r.tablename);
  END LOOP;
END
$$;
SQL

echo "Dropping replication slot on primary (if exists)..."
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name='${SLOT_NAME}') THEN
    PERFORM pg_drop_replication_slot('${SLOT_NAME}');
  END IF;
EXCEPTION
  WHEN others THEN
    -- Best effort: slot may be active; subscription recreate will fail if slot is still in use.
    RAISE NOTICE 'Could not drop replication slot %', '${SLOT_NAME}';
END
\$\$;
SQL

PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
CREATE SUBSCRIPTION ${SUBSCRIPTION_NAME}
  CONNECTION '${PRIMARY_CONNINFO}'
  PUBLICATION ${PUBLICATION_NAME}
  WITH (copy_data = true, create_slot = true, slot_name = '${SLOT_NAME}');
SQL

echo "Replication configured. NOTE: the mirror must have the SAME schema (tables) as the primary for logical replication to work."
