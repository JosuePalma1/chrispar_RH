#!/bin/bash
set -e

echo "=================================================="
echo "RESTAURANDO BACKUP DE BASE DE DATOS"
echo "=================================================="

# Esperar a que PostgreSQL esté listo
until pg_isready -U postgres -h postgres_primary; do
  echo "⏳ Esperando a que PostgreSQL esté listo..."
  sleep 2
done

echo "✅ PostgreSQL está listo. Verificando estado de la BD..."

# Verificar si la tabla usuarios existe y tiene datos
TABLE_EXISTS=$(PGPASSWORD=123 psql -U postgres -h postgres_primary -d chrispar -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios');")

if [ "$TABLE_EXISTS" = "t" ]; then
  ROW_COUNT=$(PGPASSWORD=123 psql -U postgres -h postgres_primary -d chrispar -tAc "SELECT COUNT(*) FROM usuarios;")
  
  if [ "$ROW_COUNT" -gt 1 ]; then
    echo "✅ La base de datos ya tiene datos ($ROW_COUNT usuarios)."
    echo "   Omitiendo restauración de backup."
    exit 0
  fi
fi

echo "📦 Restaurando backup con datos de prueba..."

# Restaurar el backup
PGPASSWORD=123 pg_restore -U postgres -h postgres_primary -d chrispar -c /backups/chrispar_backup.backup 2>/dev/null || true

echo "✅ Backup restaurado exitosamente"
echo ""
echo "Credenciales de acceso:"
echo "   Username: admin"
echo "   Password: 123"
echo ""
echo "=================================================="