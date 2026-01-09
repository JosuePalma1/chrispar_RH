# 📝 Ejemplos Prácticos de Failover

## Escenario 1: Fallo Inesperado del Primary

**Situación**: El servidor principal se cae por un problema de hardware.

```powershell
# El sistema detecta automáticamente el fallo
# Logs del backend mostrarán:
docker logs chrispar_backend
# Output:
# [2026-01-08 10:30:15] WARNING - Database health check failed: connection timeout
# [2026-01-08 10:30:45] WARNING - Database health check failed: connection timeout (2/3)
# [2026-01-08 10:31:15] ERROR - Database health check failed: connection timeout (3/3)
# [2026-01-08 10:31:16] INFO - Executing automatic FAILOVER to mirror database
# [2026-01-08 10:31:17] INFO - Successfully switched to mirror database
# [2026-01-08 10:31:18] INFO - Application now using: postgresql://postgres@postgres_mirror:5432/chrispar

# Verificar que el sistema cambió al mirror
curl http://localhost:5000/api/health
# {
#   "status": "healthy",
#   "database": "mirror",
#   "timestamp": "2026-01-08T10:31:20",
#   "uptime_seconds": 3
# }

# Los usuarios pueden seguir trabajando normalmente
# El sistema está usando el mirror automáticamente
```

## Escenario 2: Mantenimiento Planificado

**Situación**: Necesitas hacer mantenimiento en el servidor primary.

```powershell
# 1. Avisar a los usuarios del mantenimiento
Write-Host "Iniciando mantenimiento del servidor primary..."

# 2. Ejecutar failover manual ANTES de detener el primary
.\scripts\failover_to_mirror.ps1

# 3. Verificar que el cambio fue exitoso
curl http://localhost:5000/api/health
# {"database": "mirror", "status": "healthy"}

# 4. Ahora puedes detener el primary de forma segura
docker stop chrispar_postgres_primary

# 5. Realizar el mantenimiento necesario
# - Actualizar PostgreSQL
# - Limpiar logs
# - Optimizar base de datos
# - etc.

# 6. Cuando termines, recuperar el primary
docker start chrispar_postgres_primary

# 7. Esperar que el primary esté listo (30 segundos aprox)
Start-Sleep -Seconds 30

# 8. Volver al primary
.\scripts\failback_to_primary.ps1

# 9. Verificar que volvió al primary
curl http://localhost:5000/api/health
# {"database": "primary", "status": "healthy"}
```

## Escenario 3: Prueba de Disaster Recovery

**Situación**: Quieres probar que el sistema de failover funciona correctamente.

```powershell
# PASO 1: Estado inicial
Write-Host "`n=== ESTADO INICIAL ===" -ForegroundColor Cyan
.\scripts\check_status.ps1

# Debería mostrar:
# - Primary: CORRIENDO ✓
# - Mirror: CORRIENDO ✓
# - Backend: CORRIENDO ✓
# - Database activa: PRIMARY

# PASO 2: Simular fallo del primary
Write-Host "`n=== SIMULANDO FALLO ===" -ForegroundColor Yellow
docker stop chrispar_postgres_primary
Write-Host "Primary detenido. Esperando failover automático (90 segundos)..."

# PASO 3: Esperar el failover automático
Start-Sleep -Seconds 90

# PASO 4: Verificar failover
Write-Host "`n=== VERIFICANDO FAILOVER ===" -ForegroundColor Cyan
$healthCheck = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
if ($healthCheck.database -eq "mirror") {
    Write-Host "✓ FAILOVER EXITOSO - Sistema usando MIRROR" -ForegroundColor Green
} else {
    Write-Host "✗ FAILOVER FALLIDO - Sistema aún en PRIMARY" -ForegroundColor Red
}

# PASO 5: Probar que el sistema funciona con el mirror
Write-Host "`n=== PROBANDO FUNCIONALIDAD ===" -ForegroundColor Cyan
# Hacer login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/usuarios/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"usuario":"admin","contraseña":"123"}'

if ($loginResponse.access_token) {
    Write-Host "✓ Login exitoso - Sistema funcional con mirror" -ForegroundColor Green
} else {
    Write-Host "✗ Login falló" -ForegroundColor Red
}

# PASO 6: Recuperar el primary
Write-Host "`n=== RECUPERANDO PRIMARY ===" -ForegroundColor Cyan
docker start chrispar_postgres_primary
Write-Host "Primary iniciado. Esperando failback automático (60 segundos)..."
Start-Sleep -Seconds 60

# PASO 7: Verificar failback
Write-Host "`n=== VERIFICANDO FAILBACK ===" -ForegroundColor Cyan
$healthCheck = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
if ($healthCheck.database -eq "primary") {
    Write-Host "✓ FAILBACK EXITOSO - Sistema volvió a PRIMARY" -ForegroundColor Green
} else {
    Write-Host "! Sistema aún en MIRROR (normal si acaba de iniciar)" -ForegroundColor Yellow
}

# PASO 8: Estado final
Write-Host "`n=== ESTADO FINAL ===" -ForegroundColor Cyan
.\scripts\check_status.ps1

Write-Host "`n=== PRUEBA COMPLETADA ===" -ForegroundColor Green
```

## Escenario 4: Sincronización de Datos

**Situación**: Verificar que los datos se replican correctamente del primary al mirror.

```powershell
# 1. Asegurarse de que ambas BDs estén corriendo y replicando
.\scripts\check_status.ps1

# 2. Crear un registro en el primary
$token = (Invoke-RestMethod -Uri "http://localhost:5000/api/usuarios/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"usuario":"admin","contraseña":"123"}').access_token

$nuevoEmpleado = @{
    nombre = "Juan Pérez"
    email = "juan.perez@test.com"
    cargo_id = 1
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/empleados" `
    -Method Post `
    -ContentType "application/json" `
    -Headers @{Authorization="Bearer $token"} `
    -Body $nuevoEmpleado

$empleadoId = $response.id
Write-Host "Empleado creado con ID: $empleadoId"

# 3. Esperar un momento para la replicación
Start-Sleep -Seconds 5

# 4. Verificar en el primary
$countPrimary = docker exec chrispar_postgres_primary psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM empleados WHERE id=$empleadoId;"
Write-Host "Registros en PRIMARY: $($countPrimary.Trim())"

# 5. Verificar en el mirror
$countMirror = docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM empleados WHERE id=$empleadoId;"
Write-Host "Registros en MIRROR: $($countMirror.Trim())"

# 6. Comparar
if ($countPrimary.Trim() -eq $countMirror.Trim()) {
    Write-Host "✓ Replicación exitosa - Datos sincronizados" -ForegroundColor Green
} else {
    Write-Host "✗ Datos no sincronizados - Verificar replicación" -ForegroundColor Red
}
```

## Escenario 5: Monitoreo Continuo

**Situación**: Configurar un script de monitoreo que se ejecuta cada minuto.

```powershell
# Crear archivo: monitor_health.ps1
@'
while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5
        $db = $health.database.ToUpper()
        $status = $health.status.ToUpper()
        
        if ($status -eq "HEALTHY") {
            Write-Host "[$timestamp] ✓ Sistema OK - Usando: $db" -ForegroundColor Green
        } else {
            Write-Host "[$timestamp] ! Problema detectado - DB: $db, Status: $status" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[$timestamp] ✗ ERROR: No se pudo conectar al backend" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 60
}
'@ | Out-File -FilePath ".\scripts\monitor_health.ps1" -Encoding UTF8

# Ejecutar el monitor
.\scripts\monitor_health.ps1

# Output esperado:
# [2026-01-08 10:35:00] ✓ Sistema OK - Usando: PRIMARY
# [2026-01-08 10:36:00] ✓ Sistema OK - Usando: PRIMARY
# [2026-01-08 10:37:00] ✓ Sistema OK - Usando: PRIMARY
# [2026-01-08 10:38:00] ! Problema detectado - DB: MIRROR, Status: HEALTHY
# (Esto indica que hubo un failover)
```

## Escenario 6: Rollback de Cambios

**Situación**: Se hizo failover pero necesitas revertir inmediatamente.

```powershell
# Si acabas de hacer failover y quieres volver
.\scripts\failback_to_primary.ps1

# O si quieres resetear todo al estado inicial
.\scripts\reset_failover.ps1
```

## Escenario 7: Logs y Debugging

**Situación**: Investigar por qué ocurrió un failover.

```powershell
# Ver todos los eventos de failover
docker logs chrispar_backend | Select-String "FAILOVER" | Select-Object -Last 20

# Ver health checks recientes
docker logs chrispar_backend | Select-String "health check" | Select-Object -Last 50

# Ver errores de conexión
docker logs chrispar_backend | Select-String "connection.*failed" | Select-Object -Last 30

# Ver estado de replicación cuando ocurrió el fallo
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "
    SELECT 
        application_name,
        state,
        sync_state,
        sent_lsn,
        write_lsn,
        flush_lsn,
        replay_lsn
    FROM pg_stat_replication;
"
```

## Escenario 8: Failover sin Failback Automático

**Situación**: Quieres failover automático pero control manual del failback.

```powershell
# 1. Editar backend/.env
# Cambiar: AUTO_FAILBACK_ENABLED=false
# (Esta variable se puede agregar en una versión futura)

# 2. El sistema hará failover automáticamente al detectar fallas

# 3. Pero NO volverá automáticamente al primary

# 4. Deberás ejecutar manualmente:
.\scripts\failback_to_primary.ps1
```

## Checklist Diario de Operaciones

```powershell
# Ejecutar cada día:

# 1. Verificar estado general
.\scripts\check_status.ps1

# 2. Revisar logs de errores
docker logs chrispar_backend --since 24h | Select-String "ERROR|CRITICAL"

# 3. Verificar replicación
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT COUNT(*) FROM pg_stat_replication;"

# 4. Verificar salud del backend
curl http://localhost:5000/api/health

# 5. Revisar uso de disco
docker exec chrispar_postgres_primary du -sh /var/lib/postgresql/data
docker exec chrispar_postgres_mirror du -sh /var/lib/postgresql/data
```
