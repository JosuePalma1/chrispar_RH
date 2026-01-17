# Scripts de Failover y Replicación

Este directorio contiene scripts para manejar failover, failback y verificación de sincronización entre las bases de datos Primary y Mirror.

## 📁 Archivos

### Scripts Principales

1. **[failover_to_mirror.ps1](failover_to_mirror.ps1)**
   - Cambia el backend para usar el Mirror cuando el Primary está caído
   - Detiene el Primary y redirige las conexiones al Mirror
   - Uso: `.\scripts\failover\failover_to_mirror.ps1`

2. **[failback_to_primary.ps1](failback_to_primary.ps1)**
   - Restaura el backend para usar el Primary
   - Verifica que la replicación bidireccional esté activa
   - Sincroniza automáticamente los cambios del Mirror al Primary
   - Uso: `.\scripts\failover\failback_to_primary.ps1`

3. **[check_sync_status.ps1](check_sync_status.ps1)**
   - Verifica el estado de sincronización entre Primary y Mirror
   - Muestra conteo de registros, suscripciones, publicaciones y slots
   - Uso: `.\scripts\failover\check_sync_status.ps1`

4. **[check_status.ps1](check_status.ps1)**
   - Verifica el estado general de las bases de datos
   - Muestra qué BD está activa y configuración actual
   - Uso: `.\scripts\failover\check_status.ps1`

5. **[reset_failover.ps1](reset_failover.ps1)**
   - Resetea la configuración de failover al estado inicial
   - Útil para limpiar y empezar desde cero
   - Uso: `.\scripts\failover\reset_failover.ps1`

## 🚀 Guía de Uso Rápida

### Escenario 1: Primary Caído - Hacer Failover
```powershell
# 1. Primary se cae (o lo detienes manualmente)
docker stop chrispar_postgres_primary

# 2. Ejecutar failover al Mirror
.\scripts\failover\failover_to_mirror.ps1

# 3. Continuar trabajando normalmente con el Mirror
```

### Escenario 2: Primary Recuperado - Hacer Failback
```powershell
# 1. Ejecutar failback (esto inicia el Primary automáticamente)
.\scripts\failover\failback_to_primary.ps1

# 2. ✅ Con replicación bidireccional: Los datos del Mirror
#    se sincronizan automáticamente al Primary
```

### Escenario 3: Verificar Sincronización
```powershell
# Verificar que ambas BDs estén sincronizadas
.\scripts\failover\check_sync_status.ps1
```

## ⚙️ Configuración de Replicación

### Replicación Unidireccional (Anterior)
- Primary → Mirror ✓
- Mirror → Primary ✗
- **Problema:** Pierdes datos hechos en el Mirror durante failover

### Replicación Bidireccional (Nueva)
- Primary ⇄ Mirror
- **Ventaja:** Los cambios en cualquier BD se replican automáticamente

Ver documentación completa: [BIDIRECTIONAL_REPLICATION.md](../../docs/deployment/BIDIRECTIONAL_REPLICATION.md)

## 🔄 Flujo de Trabajo Recomendado

### Migrar a Replicación Bidireccional

```powershell
# 1. Detener el backend
docker-compose stop backend

# 2. Asegurar que ambas BDs estén activas
docker-compose up -d postgres_primary postgres_mirror

# 3. Configurar replicación bidireccional
docker-compose up replication_setup

# 4. Verificar configuración
.\scripts\failover\check_sync_status.ps1

# 5. Iniciar backend
docker-compose up -d backend
```

## 📊 Verificar Estado

### Ver qué BD está activa
```powershell
# Desde el archivo .env del backend
Get-Content .\backend\.env | Select-String "DATABASE_URL"

# Resultado:
# DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar  ← Primary activo
# o
# DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar   ← Mirror activo
```

### Ver estado de contenedores
```powershell
docker ps --filter "name=postgres"
```

## 🧪 Probar Replicación

### Test Primary → Mirror
```powershell
# 1. Insertar en Primary
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO usuario (username, email, password_hash, rol) VALUES ('test1', 'test1@test.com', 'hash', 'empleado');"

# 2. Esperar 2-3 segundos
Start-Sleep -Seconds 3

# 3. Verificar en Mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT * FROM usuario WHERE username='test1';"
```

### Test Mirror → Primary
```powershell
# 1. Insertar en Mirror
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "INSERT INTO usuario (username, email, password_hash, rol) VALUES ('test2', 'test2@test.com', 'hash', 'empleado');"

# 2. Esperar 2-3 segundos
Start-Sleep -Seconds 3

# 3. Verificar en Primary
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT * FROM usuario WHERE username='test2';"
```

## ⚠️ Consideraciones

1. **Evitar escrituras simultáneas:** No escribas en ambas BDs al mismo tiempo
2. **Latencia:** La replicación toma milisegundos, pero espera 2-3 segundos antes de verificar
3. **Slots de replicación:** Si una BD está caída por mucho tiempo, los slots pueden consumir espacio en disco

## 🆘 Solución de Problemas

### Problema: Los datos no se replican
```powershell
# 1. Verificar suscripciones
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT subname, subenabled FROM pg_subscription;"

# 2. Si están deshabilitadas, habilitar
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "ALTER SUBSCRIPTION chrispar_sub_from_mirror ENABLE;"
```

### Problema: Conflictos de sincronización
```powershell
# Reconfigurar desde cero
docker-compose stop backend
docker-compose up replication_setup
docker-compose start backend
```

## 📚 Documentación Completa

- [Guía de Replicación Bidireccional](../../docs/deployment/BIDIRECTIONAL_REPLICATION.md)
- [Guía de Despliegue en Ubuntu](../../docs/deployment/UBUNTU_NGINX_DEPLOYMENT.md)

## 🔗 Referencias

- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
