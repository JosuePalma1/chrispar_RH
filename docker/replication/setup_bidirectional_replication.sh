#!/usr/bin/env bash
set -euo pipefail

PRIMARY_HOST="${PRIMARY_HOST:-postgres_primary}"
MIRROR_HOST="${MIRROR_HOST:-postgres_mirror}"
DB_NAME="${DB_NAME:-chrispar}"
REPL_USER="${REPL_USER:-replicator}"
REPL_PASSWORD="${REPL_PASSWORD:-replicatorpass}"
PRIMARY_PUB_NAME="${PRIMARY_PUB_NAME:-chrispar_pub_primary}"
MIRROR_PUB_NAME="${MIRROR_PUB_NAME:-chrispar_pub_mirror}"
PRIMARY_SUB_NAME="${PRIMARY_SUB_NAME:-chrispar_sub_from_mirror}"
MIRROR_SUB_NAME="${MIRROR_SUB_NAME:-chrispar_sub_from_primary}"
PRIMARY_SLOT_NAME="${PRIMARY_SLOT_NAME:-chrispar_slot_primary}"
MIRROR_SLOT_NAME="${MIRROR_SLOT_NAME:-chrispar_slot_mirror}"

echo "================================================"
echo "  CONFIGURACIÓN DE REPLICACIÓN BIDIRECCIONAL"
echo "================================================"
echo ""

# ==========================================
# PASO 1: Verificar conectividad
# ==========================================
echo "[1/8] Verificando conectividad..."
until pg_isready -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" >/dev/null 2>&1; do
  echo "  Esperando Primary..."
  sleep 1
done
echo "  ✓ Primary conectado"

until pg_isready -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" >/dev/null 2>&1; do
  echo "  Esperando Mirror..."
  sleep 1
done
echo "  ✓ Mirror conectado"

# ==========================================
# PASO 2: Sincronizar esquemas
# ==========================================
echo ""
echo "[2/8] Sincronizando esquemas..."
TABLE_COUNT=$(PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | xargs)

if [ "$TABLE_COUNT" -eq 0 ] || [ "$TABLE_COUNT" -eq 1 ]; then
  echo "  Mirror sin esquema. Copiando desde Primary..."
  PGPASSWORD=123 pg_dump -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" --schema-only | PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}"
  echo "  ✓ Esquema copiado"
else
  echo "  ✓ Mirror ya tiene esquema ($TABLE_COUNT tablas)"
fi

# ==========================================
# PASO 3: Crear usuario de replicación
# ==========================================
echo ""
echo "[3/8] Configurando usuarios de replicación..."

# En Primary
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
SQL

# En Mirror
PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
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
SQL

echo "  ✓ Usuarios de replicación configurados"

# ==========================================
# PASO 4: Limpiar replicaciones anteriores
# ==========================================
echo ""
echo "[4/8] Limpiando configuraciones anteriores..."

# Eliminar suscripciones antiguas
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
DROP SUBSCRIPTION IF EXISTS ${PRIMARY_SUB_NAME};
DROP SUBSCRIPTION IF EXISTS chrispar_sub; -- Suscripción anterior unidireccional
SQL

PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
DROP SUBSCRIPTION IF EXISTS ${MIRROR_SUB_NAME};
DROP SUBSCRIPTION IF EXISTS chrispar_sub; -- Suscripción anterior unidireccional
SQL

# Eliminar publicaciones antiguas
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
DROP PUBLICATION IF EXISTS ${PRIMARY_PUB_NAME};
DROP PUBLICATION IF EXISTS chrispar_pub; -- Publicación anterior unidireccional
SQL

PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
DROP PUBLICATION IF EXISTS ${MIRROR_PUB_NAME};
SQL

# Eliminar slots de replicación
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
SELECT pg_drop_replication_slot(slot_name)
FROM pg_replication_slots
WHERE slot_name IN ('${PRIMARY_SLOT_NAME}', '${MIRROR_SLOT_NAME}', 'chrispar_slot');
SQL

PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
SELECT pg_drop_replication_slot(slot_name)
FROM pg_replication_slots
WHERE slot_name IN ('${PRIMARY_SLOT_NAME}', '${MIRROR_SLOT_NAME}', 'chrispar_slot');
SQL

echo "  ✓ Configuraciones anteriores eliminadas"

# ==========================================
# PASO 5: Sincronizar datos iniciales
# ==========================================
echo ""
echo "[5/8] Sincronizando datos iniciales..."
echo "  Truncando tablas en Mirror..."

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

echo "  Copiando datos desde Primary..."
PGPASSWORD=123 pg_dump -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" --data-only --exclude-table=alembic_version | PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}"

echo "  ✓ Datos sincronizados"

# ==========================================
# PASO 6: Crear publicaciones
# ==========================================
echo ""
echo "[6/8] Creando publicaciones bidireccionales..."

# Publicación en Primary (para que Mirror se suscriba)
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
CREATE PUBLICATION ${PRIMARY_PUB_NAME} FOR ALL TABLES;
SQL
echo "  ✓ Publicación creada en Primary: ${PRIMARY_PUB_NAME}"

# Publicación en Mirror (para que Primary se suscriba)
PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
CREATE PUBLICATION ${MIRROR_PUB_NAME} FOR ALL TABLES;
SQL
echo "  ✓ Publicación creada en Mirror: ${MIRROR_PUB_NAME}"

# ==========================================
# PASO 7: Crear suscripciones
# ==========================================
echo ""
echo "[7/8] Creando suscripciones bidireccionales..."

# Mirror se suscribe a Primary
PRIMARY_CONNINFO="host=${PRIMARY_HOST} port=5432 dbname=${DB_NAME} user=${REPL_USER} password=${REPL_PASSWORD}"
PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" <<SQL
CREATE SUBSCRIPTION ${MIRROR_SUB_NAME}
  CONNECTION '${PRIMARY_CONNINFO}'
  PUBLICATION ${PRIMARY_PUB_NAME}
  WITH (
    copy_data = false,
    create_slot = true,
    enabled = true,
    slot_name = '${MIRROR_SLOT_NAME}'
  );
SQL
echo "  ✓ Mirror suscrito a Primary"

# Primary se suscribe a Mirror
MIRROR_CONNINFO="host=${MIRROR_HOST} port=5432 dbname=${DB_NAME} user=${REPL_USER} password=${REPL_PASSWORD}"
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" <<SQL
CREATE SUBSCRIPTION ${PRIMARY_SUB_NAME}
  CONNECTION '${MIRROR_CONNINFO}'
  PUBLICATION ${MIRROR_PUB_NAME}
  WITH (
    copy_data = false,
    create_slot = true,
    enabled = true,
    slot_name = '${PRIMARY_SLOT_NAME}'
  );
SQL
echo "  ✓ Primary suscrito a Mirror"

# ==========================================
# PASO 8: Verificar configuración
# ==========================================
echo ""
echo "[8/8] Verificando configuración..."

echo ""
echo "  📊 Publicaciones en Primary:"
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" -c "SELECT pubname FROM pg_publication;"

echo ""
echo "  📊 Publicaciones en Mirror:"
PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" -c "SELECT pubname FROM pg_publication;"

echo ""
echo "  📊 Suscripciones en Primary:"
PGPASSWORD=123 psql -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}" -c "SELECT subname, subenabled FROM pg_subscription;"

echo ""
echo "  📊 Suscripciones en Mirror:"
PGPASSWORD=123 psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" -c "SELECT subname, subenabled FROM pg_subscription;"

echo ""
echo "================================================"
echo "  ✅ REPLICACIÓN BIDIRECCIONAL CONFIGURADA"
echo "================================================"
echo ""
echo "💡 Los cambios ahora se replican en ambas direcciones:"
echo "   • Primary → Mirror"
echo "   • Mirror → Primary"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   • Evita hacer CRUD simultáneamente en ambas BDs"
echo "   • Usa solo una BD a la vez (Primary O Mirror)"
echo "   • Los cambios en Mirror se sincronizarán al Primary automáticamente"
echo ""
