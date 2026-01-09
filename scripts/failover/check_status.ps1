#!/usr/bin/env pwsh
# ==============================================================================
# Script: check_status.ps1
# Descripción: Verifica el estado completo del sistema de failover
# Uso: .\scripts\check_status.ps1
# ==============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ESTADO DEL SISTEMA DE FAILOVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Estado de los contenedores
Write-Host "[1] ESTADO DE CONTENEDORES POSTGRES:" -ForegroundColor Yellow
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host "`n[2] ESTADO DEL BACKEND:" -ForegroundColor Yellow
docker ps --filter "name=chrispar_backend" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

# 2. Health check del backend
Write-Host "`n[3] HEALTH CHECK DEL BACKEND:" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5
    Write-Host "Status: " -NoNewline
    if ($healthResponse.status -eq "healthy") {
        Write-Host "HEALTHY ✓" -ForegroundColor Green
    } else {
        Write-Host "UNHEALTHY ✗" -ForegroundColor Red
    }
    Write-Host "Database activa: " -NoNewline
    if ($healthResponse.database -eq "primary") {
        Write-Host "PRIMARY" -ForegroundColor Green
    } else {
        Write-Host "MIRROR" -ForegroundColor Yellow
    }
    Write-Host "Timestamp: $($healthResponse.timestamp)"
} catch {
    Write-Host "ERROR: No se pudo conectar al backend" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 3. Estado de replicación
Write-Host "`n[4] ESTADO DE REPLICACION:" -ForegroundColor Yellow
try {
    $replStatus = docker exec chrispar_postgres_primary psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM pg_stat_replication;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $count = $replStatus.Trim()
        if ([int]$count -gt 0) {
            Write-Host "Replicación activa: " -NoNewline
            Write-Host "SÍ ✓ ($count conexión(es))" -ForegroundColor Green
            
            # Detalles de replicación
            Write-Host "`nDetalles de replicación:" -ForegroundColor Gray
            docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT application_name, state, sync_state FROM pg_stat_replication;" 2>$null
        } else {
            Write-Host "Replicación activa: " -NoNewline
            Write-Host "NO ✗" -ForegroundColor Yellow
            Write-Host "(Esto es normal si el sistema está en modo failover)" -ForegroundColor Gray
        }
    } else {
        Write-Host "Primary no disponible o detenido" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: No se pudo verificar replicación" -ForegroundColor Red
}

# 4. Suscripción en el mirror
Write-Host "`n[5] SUSCRIPCION EN EL MIRROR:" -ForegroundColor Yellow
try {
    $subStatus = docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM pg_subscription;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $count = $subStatus.Trim()
        if ([int]$count -gt 0) {
            Write-Host "Suscripción activa: " -NoNewline
            Write-Host "SÍ ✓" -ForegroundColor Green
            
            # Estado de la suscripción
            docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT subname, subenabled FROM pg_subscription;" 2>$null
        } else {
            Write-Host "Suscripción activa: " -NoNewline
            Write-Host "NO ✗" -ForegroundColor Yellow
            Write-Host "(Esto es normal si el sistema hizo failover al mirror)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "ERROR: No se pudo verificar suscripción" -ForegroundColor Red
}

# 5. Últimas líneas del log del backend
Write-Host "`n[6] ULTIMOS EVENTOS DEL BACKEND:" -ForegroundColor Yellow
docker logs chrispar_backend --tail 10 2>$null | Select-String -Pattern "FAILOVER|health|database|error" -Context 0

# 6. Variables de entorno de failover
Write-Host "`n[7] CONFIGURACION DE FAILOVER:" -ForegroundColor Yellow
try {
    $envVars = docker exec chrispar_backend env 2>$null | Select-String -Pattern "AUTO_FAILOVER|HEALTH_CHECK|DATABASE_URL"
    foreach ($var in $envVars) {
        Write-Host $var
    }
} catch {
    Write-Host "ERROR: No se pudo leer configuración" -ForegroundColor Red
}

# Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Determinar estado general
$primaryRunning = (docker ps --filter "name=chrispar_postgres_primary" --filter "status=running" --quiet) -ne $null
$mirrorRunning = (docker ps --filter "name=chrispar_postgres_mirror" --filter "status=running" --quiet) -ne $null
$backendRunning = (docker ps --filter "name=chrispar_backend" --filter "status=running" --quiet) -ne $null

Write-Host "`nEstado de servicios:" -ForegroundColor White
Write-Host "  Primary: " -NoNewline
if ($primaryRunning) { Write-Host "CORRIENDO ✓" -ForegroundColor Green } else { Write-Host "DETENIDO ✗" -ForegroundColor Red }
Write-Host "  Mirror:  " -NoNewline
if ($mirrorRunning) { Write-Host "CORRIENDO ✓" -ForegroundColor Green } else { Write-Host "DETENIDO ✗" -ForegroundColor Red }
Write-Host "  Backend: " -NoNewline
if ($backendRunning) { Write-Host "CORRIENDO ✓" -ForegroundColor Green } else { Write-Host "DETENIDO ✗" -ForegroundColor Red }

Write-Host "`nAcciones sugeridas:" -ForegroundColor White
if (-not $primaryRunning -and $backendRunning) {
    Write-Host "  • El primary está detenido. El sistema debería estar usando el mirror." -ForegroundColor Yellow
    Write-Host "  • Para recuperar: docker start chrispar_postgres_primary" -ForegroundColor Cyan
} elseif ($primaryRunning -and $mirrorRunning -and $backendRunning) {
    Write-Host "  • Todo está funcionando correctamente ✓" -ForegroundColor Green
} else {
    Write-Host "  • Hay servicios detenidos. Ejecuta: docker-compose up -d" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
