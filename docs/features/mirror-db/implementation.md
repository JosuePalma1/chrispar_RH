# Documentación: Base de Datos Espejo (Mirror) con Replicación Lógica
## Sistema CHRISPAR HHRR - Manual de Implementación

---

## 1. INTRODUCCIÓN

La base de datos espejo es una réplica exacta de la base de datos principal que se mantiene sincronizada en tiempo real mediante replicación lógica de PostgreSQL. Esta configuración proporciona:

- **Redundancia de datos**: Copia exacta de todos los datos
- **Alta disponibilidad**: Si falla el primary, el mirror puede tomar su lugar
- **Lectura distribuida**: Posibilidad de consultar el mirror sin afectar el primary

---

## 2. ARQUITECTURA DE REPLICACIÓN

### Contenedores Docker

```
┌─────────────────────┐         ┌─────────────────────┐
│  postgres_primary   │ ═════>  │  postgres_mirror    │
│  Puerto: 5434       │ Repl.   │  Puerto: 5433       │
│  Rol: Master        │ Lógica  │  Rol: Replica       │
└─────────────────────┘         └─────────────────────┘
         │                               │
         ▼                               ▼
   pg_primary_data               pg_mirror_data
   (Volumen Docker)              (Volumen Docker)
```

### Tipo de Replicación

Se utiliza **replicación lógica** de PostgreSQL que replica:
- ✅ INSERT, UPDATE, DELETE en tiempo real
- ✅ Todas las tablas del esquema public
- ❌ NO replica el esquema (DDL) - solo datos (DML)

---

## 3. CONFIGURACIÓN EN DOCKER-COMPOSE

### 3.1 Contenedor Primary

```yaml
postgres_primary:
  image: postgres:16
  container_name: chrispar_postgres_primary
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: 123
    POSTGRES_DB: chrispar
  ports:
    - "5434:5432"
  command:
    - "postgres"
    - "-c"
    - "wal_level=logical"              # Habilita replicación lógica
    - "-c"
    - "max_wal_senders=10"             # Máximo de procesos WAL sender
    - "-c"
    - "max_replication_slots=10"       # Máximo de slots de replicación
  volumes:
    - pg_primary_data:/var/lib/postgresql/data
  networks:
    - chrispar_network
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Parámetros importantes:**
- `wal_level=logical`: Habilita la replicación lógica (nivel de registro WAL)
- `max_wal_senders=10`: Permite hasta 10 conexiones de replicación simultáneas
- `max_replication_slots=10`: Permite crear hasta 10 slots de replicación

### 3.2 Contenedor Mirror

```yaml
postgres_mirror:
  image: postgres:16
  container_name: chrispar_postgres_mirror
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: 123
    POSTGRES_DB: chrispar
  ports:
    - "5433:5432"
  volumes:
    - pg_mirror_data:/var/lib/postgresql/data
  networks:
    - chrispar_network
```

### 3.3 Contenedor de Configuración de Replicación

```yaml
replication_setup:
  image: postgres:16
  container_name: chrispar_replication_setup
  depends_on:
    postgres_primary:
      condition: service_healthy
    postgres_mirror:
      condition: service_started
  restart: "no"
  volumes:
    - ./docker/replication/setup_replication.sh:/setup_replication.sh:ro
  entrypoint: ["bash", "/setup_replication.sh"]
  environment:
    PRIMARY_HOST: postgres_primary
    MIRROR_HOST: postgres_mirror
    DB_NAME: chrispar
    REPL_USER: replicator
    REPL_PASSWORD: replicatorpass
    PUBLICATION_NAME: chrispar_pub
    SUBSCRIPTION_NAME: chrispar_sub
    SLOT_NAME: chrispar_slot
  networks:
    - chrispar_network
```

---

## 4. SCRIPT DE CONFIGURACIÓN AUTOMÁTICA

El archivo `setup_replication.sh` automatiza la configuración de la replicación:

### 4.1 Espera de servicios
```bash
until pg_isready -h "${PRIMARY_HOST}" -U postgres -d "${DB_NAME}"; do
  sleep 1
done
```

### 4.2 Copia del esquema (si el mirror está vacío)
```bash
TABLE_COUNT=$(psql -h "${MIRROR_HOST}" -U postgres -d "${DB_NAME}" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

if [ "$TABLE_COUNT" -eq 0 ]; then
  pg_dump -h "${PRIMARY_HOST}" --schema-only | \
  psql -h "${MIRROR_HOST}"
fi
```

### 4.3 Creación de usuario de replicación en PRIMARY
```sql
CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD 'replicatorpass';
GRANT CONNECT ON DATABASE chrispar TO replicator;
GRANT USAGE ON SCHEMA public TO replicator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO replicator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO replicator;
```

### 4.4 Creación de publicación en PRIMARY
```sql
CREATE PUBLICATION chrispar_pub FOR ALL TABLES;
```

### 4.5 Creación de suscripción en MIRROR
```sql
CREATE SUBSCRIPTION chrispar_sub
  CONNECTION 'host=postgres_primary port=5432 dbname=chrispar user=replicator password=replicatorpass'
  PUBLICATION chrispar_pub
  WITH (copy_data = true, create_slot = true, slot_name = 'chrispar_slot');
```

---

## 5. COMANDOS DE VERIFICACIÓN

### 5.1 Verificar estado de contenedores
```powershell
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 5.2 Verificar publicación (PRIMARY)
```powershell
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT pubname, puballtables FROM pg_publication;"
```

### 5.3 Verificar suscripción (MIRROR)
```powershell
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT subname, subenabled, subslotname FROM pg_subscription;"
```

### 5.4 Comparar datos
```powershell
# En PRIMARY
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT COUNT(*) FROM usuarios;"

# En MIRROR
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT COUNT(*) FROM usuarios;"
```

### 5.5 Probar replicación en tiempo real
```powershell
# Insertar en PRIMARY
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO cargos (nombre_cargo, sueldo_base) VALUES ('Test', 1500) RETURNING id_cargo;"

# Verificar en MIRROR (después de 1-2 segundos)
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT * FROM cargos WHERE nombre_cargo = 'Test';"
```

---

## 6. PROCESO DE INICIALIZACIÓN

### Paso 1: Levantar servicios
```powershell
docker-compose up -d
```

### Paso 2: Verificar que primary está saludable
```powershell
docker ps --filter "name=postgres_primary"
# Debe mostrar "healthy" en el estado
```

### Paso 3: El contenedor replication_setup ejecuta automáticamente
- Espera a que ambos contenedores estén listos
- Copia el esquema si el mirror está vacío
- Configura usuario replicator
- Crea publicación en primary
- Crea suscripción en mirror

### Paso 4: Verificar replicación
```powershell
# Ver logs del contenedor de configuración
docker logs chrispar_replication_setup

# Debe terminar con: "Replication configured..."
```

---

## 7. INTEGRACIÓN CON LA APLICACIÓN

El backend de Flask está configurado para conectarse a ambas bases de datos:

### Variables de entorno (.env)
```bash
DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar
```

### Endpoints de API para el espejo

#### 7.1 Verificar estado del mirror
```http
GET /api/mirror/status
```
Retorna información sobre la conexión y configuración del mirror.

#### 7.2 Listar tablas en el mirror
```http
GET /api/mirror/tables
```
Muestra todas las tablas presentes en el mirror con su conteo de registros.

#### 7.3 Ver datos de una tabla específica
```http
GET /api/mirror/table/<table_name>?limit=50
```
Consulta registros de una tabla específica en el mirror.

---

## 8. MANTENIMIENTO Y OPERACIÓN

### 8.1 Detener el mirror temporalmente
```powershell
docker stop chrispar_postgres_mirror
```
El primary seguirá funcionando normalmente. Los cambios se acumularán en el WAL.

### 8.2 Reiniciar el mirror
```powershell
docker start chrispar_postgres_mirror
```
El mirror se sincronizará automáticamente con todos los cambios pendientes.

### 8.3 Ver lag de replicación
```powershell
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT slot_name, active, restart_lsn FROM pg_replication_slots;"
```

### 8.4 Reiniciar replicación (si hay problemas)
```powershell
# 1. Detener suscripción en mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "DROP SUBSCRIPTION IF EXISTS chrispar_sub;"

# 2. Limpiar datos del mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "TRUNCATE TABLE usuarios, empleados, cargos, horario, asistencias, permisos, nominas, rubros, hoja_vida, log_transaccional CASCADE;"

# 3. Reejecutar configuración
docker start chrispar_replication_setup
```

---

## 9. VENTAJAS DE ESTA IMPLEMENTACIÓN

✅ **Independencia**: Cada contenedor puede detenerse/iniciarse sin afectar al otro  
✅ **Sincronización automática**: Los cambios se replican en milisegundos  
✅ **Recuperación ante fallos**: Si el mirror se detiene, se sincroniza al reiniciar  
✅ **Escalabilidad**: Se pueden agregar múltiples mirrors para lectura  
✅ **Portabilidad**: Todo configurado en Docker, funciona en cualquier entorno  
✅ **Configuración automática**: Script automatiza todo el proceso inicial  

---

## 10. LIMITACIONES Y CONSIDERACIONES

⚠️ **Solo replica datos**: Los cambios en el esquema (ALTER TABLE, CREATE TABLE) deben aplicarse manualmente en ambas bases  
⚠️ **Dirección única**: La replicación va de primary → mirror, no es bidireccional  
⚠️ **No es backup**: El mirror replica también las eliminaciones, no reemplaza un sistema de backups  
⚠️ **Requiere mismo esquema**: Ambas bases deben tener exactamente la misma estructura de tablas  

---

## 11. TROUBLESHOOTING

### Problema: El mirror no tiene tablas
**Solución:**
```powershell
# Exportar esquema del primary
docker exec chrispar_postgres_primary pg_dump -U postgres -d chrispar --schema-only > schema.sql

# Importar al mirror
Get-Content schema.sql | docker exec -i chrispar_postgres_mirror psql -U postgres -d chrispar
```

### Problema: La suscripción no existe
**Solución:** Reejecutar el script de configuración
```powershell
docker start chrispar_replication_setup
```

### Problema: Error "exec format error" en replication_setup
**Causa:** Terminaciones de línea Windows (CRLF) en setup_replication.sh  
**Solución:**
```powershell
$content = Get-Content "docker/replication/setup_replication.sh" -Raw
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("docker/replication/setup_replication.sh", $content)
```

---

## 12. DEMOSTRACIÓN PARA LA EXPOSICIÓN

Ejecutar el script de demostración automatizado:
```powershell
.\scripts\demo_espejo.ps1
```

Este script demuestra:
1. ✅ Ambos contenedores ejecutándose independientemente
2. ✅ Configuración de publicación y suscripción
3. ✅ Datos idénticos en ambas bases
4. ✅ Replicación en tiempo real (INSERT)
5. ✅ Independencia y auto-sincronización tras desconexión
6. ✅ Replicación de actualizaciones (UPDATE)
7. ✅ Replicación de eliminaciones (DELETE)

---

**Fecha de implementación:** Enero 2026  
**Tecnología:** PostgreSQL 16 + Docker  
**Tipo de replicación:** Lógica (Publicación/Suscripción)  
**Sistema:** CHRISPAR HHRR - Gestión de Recursos Humanos
