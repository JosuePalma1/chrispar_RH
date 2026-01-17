# Guía de Replicación Bidireccional en Docker

## 📖 Descripción

Esta guía explica cómo funciona la **replicación bidireccional** entre `postgres_primary` y `postgres_mirror`, permitiendo que los cambios realizados en cualquiera de las bases de datos se sincronicen automáticamente con la otra.

---

## 🔄 ¿Qué es la Replicación Bidireccional?

### Replicación Unidireccional (Anterior)
```
Primary → Mirror  ✓
Mirror → Primary  ✗ (Sin sincronización)
```

**Problema:** Si el Primary cae y trabajas en el Mirror, cuando el Primary vuelve, pierdes todos los cambios hechos en el Mirror.

### Replicación Bidireccional (Nueva)
```
Primary ⇄ Mirror
```

**Ventaja:** Los cambios en cualquier BD se replican automáticamente a la otra. No pierdes datos en failover/failback.

---

## 🎯 Casos de Uso

### Escenario 1: Primary Caído
1. Primary se cae → Ejecutas `failover_to_mirror.ps1`
2. Backend se conecta al Mirror
3. Haces CRUD en el Mirror (INSERT, UPDATE, DELETE)
4. Primary vuelve → Los cambios del Mirror **se sincronizan automáticamente** al Primary
5. Ejecutas `failback_to_primary.ps1` sin pérdida de datos ✅

### Escenario 2: Desarrollo y Testing
- Puedes probar cambios en el Mirror sin afectar el Primary
- Los cambios se replican automáticamente
- Útil para pruebas de carga o migraciones

---

## 🛠️ Configuración

### 1. Configurar Replicación Bidireccional

#### Opción A: Desde Cero (Nueva instalación)
```bash
# Editar docker-compose.yml
# Cambiar el servicio replication_setup para usar el nuevo script
```

Modificar en [docker-compose.yml](../../docker-compose.yml):
```yaml
replication_setup:
  # ... (mantener configuración existente)
  volumes:
    - ./docker/replication/setup_bidirectional_replication.sh:/setup_replication.sh:ro
```

Luego:
```powershell
# Iniciar los contenedores
docker-compose up -d postgres_primary postgres_mirror

# Ejecutar configuración bidireccional
docker-compose up replication_setup
```

#### Opción B: Migrar desde Replicación Unidireccional (Instalación existente)
```powershell
# 1. Detener el backend (para evitar escrituras durante la migración)
docker-compose stop backend

# 2. Asegurarse de que ambas BDs estén activas
docker-compose up -d postgres_primary postgres_mirror

# 3. Ejecutar script de configuración bidireccional
docker-compose run --rm replication_setup bash /docker/replication/setup_bidirectional_replication.sh
```

---

## 📊 Verificar Estado de Replicación

### Script de Verificación
```powershell
# Ejecutar script de verificación
.\scripts\failover\check_sync_status.ps1
```

**Resultado esperado:**
```
[1] Estado de Contenedores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAMES                        STATUS       PORTS
chrispar_postgres_primary    Up 5 hours   0.0.0.0:5434->5432/tcp
chrispar_postgres_mirror     Up 5 hours   0.0.0.0:5433->5432/tcp

[2] Verificando Conectividad
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Primary: Conectado
  ✓ Mirror: Conectado

[4] Comparación de Datos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tabla          | Primary | Mirror  | Estado
  ───────────────|─────────|─────────|─────────
  usuario        | 5       | 5       | ✓ Sync
  empleado       | 10      | 10      | ✓ Sync
  cargo          | 8       | 8       | ✓ Sync
  asistencia     | 50      | 50      | ✓ Sync
  nomina         | 15      | 15      | ✓ Sync

[6] Resumen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Las bases de datos están sincronizadas
```

### Verificación Manual

#### Ver publicaciones
```powershell
# En Primary
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT pubname FROM pg_publication;"

# Resultado esperado:
# chrispar_pub_primary  (publica cambios del Primary)

# En Mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT pubname FROM pg_publication;"

# Resultado esperado:
# chrispar_pub_mirror   (publica cambios del Mirror)
```

#### Ver suscripciones
```powershell
# En Primary
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT subname, subenabled FROM pg_subscription;"

# Resultado esperado:
# chrispar_sub_from_mirror | t  (Primary recibe cambios del Mirror)

# En Mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT subname, subenabled FROM pg_subscription;"

# Resultado esperado:
# chrispar_sub_from_primary | t  (Mirror recibe cambios del Primary)
```

---

## 🧪 Probar Replicación

### Test 1: Primary → Mirror
```powershell
# 1. Insertar en Primary
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO usuario (username, email, password_hash, rol) VALUES ('test_user', 'test@example.com', 'hash123', 'empleado');"

# 2. Esperar 2-3 segundos
Start-Sleep -Seconds 3

# 3. Verificar en Mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT * FROM usuario WHERE username='test_user';"

# ✅ Debería aparecer el registro
```

### Test 2: Mirror → Primary
```powershell
# 1. Insertar en Mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "INSERT INTO usuario (username, email, password_hash, rol) VALUES ('test_mirror', 'mirror@example.com', 'hash456', 'empleado');"

# 2. Esperar 2-3 segundos
Start-Sleep -Seconds 3

# 3. Verificar en Primary
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT * FROM usuario WHERE username='test_mirror';"

# ✅ Debería aparecer el registro
```

---

## 🚨 Proceso de Failover/Failback

### Failover (Primary → Mirror)
```powershell
# 1. Primary cae (simulado o real)
docker stop chrispar_postgres_primary

# 2. Ejecutar failover
.\scripts\failover\failover_to_mirror.ps1

# 3. Backend ahora usa Mirror
# 4. Hacer CRUD normalmente (se guarda en Mirror)
```

### Failback (Mirror → Primary)
```powershell
# 1. Ejecutar failback (esto inicia el Primary y cambia la conexión)
.\scripts\failover\failback_to_primary.ps1

# 2. Con replicación bidireccional:
#    - Primary se inicia
#    - Los cambios del Mirror se sincronizan automáticamente al Primary
#    - Backend vuelve a usar Primary
#    - ✅ No se pierden datos
```

---

## ⚠️ Consideraciones Importantes

### 1. Evitar Conflictos de Escritura
**NO escribas simultáneamente en ambas BDs.** Esto puede causar conflictos de replicación.

**Regla de Oro:**
- Si usas Primary → Solo escribe en Primary
- Si usas Mirror (failover) → Solo escribe en Mirror
- El backend solo se conecta a UNA BD a la vez

### 2. Latencia de Replicación
Los cambios se replican en **milisegundos**, pero hay un pequeño delay:
- Cambios locales: ~10-100ms
- Bajo carga: puede ser mayor

**Recomendación:** Espera 2-3 segundos después de un failover antes de hacer cambios críticos.

### 3. Conflictos de Secuencias (IDs)
Las secuencias (IDs auto-incrementales) pueden causar conflictos si insertas en ambas BDs simultáneamente.

**Solución:** El backend solo escribe en una BD a la vez, evitando este problema.

### 4. Monitoreo de Slots de Replicación
Los slots de replicación consumen espacio en disco si una BD está caída por mucho tiempo.

**Comando de limpieza:**
```powershell
# Ver slots activos
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT slot_name, active FROM pg_replication_slots;"

# Si un slot está inactivo y la BD está permanentemente caída, elimínalo:
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT pg_drop_replication_slot('nombre_del_slot');"
```

---

## 🔧 Solución de Problemas

### Problema 1: Datos no se replican
```powershell
# 1. Verificar que las suscripciones estén habilitadas
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT subname, subenabled FROM pg_subscription;"
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT subname, subenabled FROM pg_subscription;"

# 2. Si subenabled = 'f' (false), habilitar:
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "ALTER SUBSCRIPTION chrispar_sub_from_mirror ENABLE;"
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "ALTER SUBSCRIPTION chrispar_sub_from_primary ENABLE;"

# 3. Verificar logs
docker logs chrispar_postgres_primary 2>&1 | Select-String "replication"
docker logs chrispar_postgres_mirror 2>&1 | Select-String "replication"
```

### Problema 2: Slot de replicación no existe
```powershell
# Reconfigurar replicación desde cero
docker-compose up replication_setup
```

### Problema 3: Conflictos de datos (muy raro)
```powershell
# 1. Detener backend
docker-compose stop backend

# 2. Identificar cuál BD tiene los datos correctos

# 3. Opción A: Primary tiene los datos correctos
#    Copiar Primary → Mirror
docker exec chrispar_postgres_primary pg_dump -U postgres chrispar --data-only > backup.sql
docker exec -i chrispar_postgres_mirror psql -U postgres chrispar < backup.sql

# 3. Opción B: Mirror tiene los datos correctos
#    Copiar Mirror → Primary
docker exec chrispar_postgres_mirror pg_dump -U postgres chrispar --data-only > backup.sql
docker exec -i chrispar_postgres_primary psql -U postgres chrispar < backup.sql

# 4. Reconfigurar replicación
docker-compose up replication_setup

# 5. Iniciar backend
docker-compose start backend
```

---

## 📚 Comandos Útiles

### Verificar estado general
```powershell
.\scripts\failover\check_sync_status.ps1
```

### Ver logs de replicación
```powershell
# Primary
docker logs chrispar_postgres_primary -f | Select-String "logical replication|subscription|publication"

# Mirror
docker logs chrispar_postgres_mirror -f | Select-String "logical replication|subscription|publication"
```

### Resetear todo (CUIDADO: Borra datos)
```powershell
# 1. Detener todo
docker-compose down

# 2. Eliminar volúmenes
docker volume rm chrispar_hhrr_pg_primary_data chrispar_hhrr_pg_mirror_data

# 3. Iniciar desde cero
docker-compose up -d postgres_primary postgres_mirror
docker-compose up replication_setup
```

---

## 🎓 Conceptos Técnicos

### Publicación (Publication)
Una publicación es un conjunto de tablas cuyos cambios se publican para que otras BDs se suscriban.

```sql
-- Crear publicación para todas las tablas
CREATE PUBLICATION chrispar_pub_primary FOR ALL TABLES;
```

### Suscripción (Subscription)
Una suscripción permite que una BD reciba cambios de una publicación en otra BD.

```sql
-- Primary se suscribe a los cambios del Mirror
CREATE SUBSCRIPTION chrispar_sub_from_mirror
  CONNECTION 'host=postgres_mirror port=5432 dbname=chrispar user=replicator password=replicatorpass'
  PUBLICATION chrispar_pub_mirror;
```

### Slot de Replicación
Un slot mantiene el estado de replicación y garantiza que los cambios no se pierdan si la suscripción está temporalmente inactiva.

---

## 📖 Referencias

- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL Publications](https://www.postgresql.org/docs/current/logical-replication-publication.html)
- [PostgreSQL Subscriptions](https://www.postgresql.org/docs/current/logical-replication-subscription.html)

---

## ✅ Checklist de Configuración

- [ ] Replicación bidireccional configurada
- [ ] Ambas BDs tienen publicaciones activas
- [ ] Ambas BDs tienen suscripciones activas
- [ ] Script de verificación ejecutado correctamente
- [ ] Test de replicación Primary → Mirror exitoso
- [ ] Test de replicación Mirror → Primary exitoso
- [ ] Scripts de failover/failback probados
- [ ] Backend puede conectarse a ambas BDs

---

¿Necesitas ayuda? Ejecuta el script de verificación:
```powershell
.\scripts\failover\check_sync_status.ps1
```
