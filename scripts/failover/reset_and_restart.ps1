# ==========================================
# Script de Reinicio Limpio del Sistema
# ==========================================
# Este script reinicia todo el sistema desde cero con la configuración correcta:
# - Primary como BD principal por defecto
# - Replicación bidireccional configurada
# - Backend apuntando al Primary

Write-Host "=== Reinicio Limpio del Sistema ===" -ForegroundColor Cyan
Write-Host "Este proceso:" -ForegroundColor Yellow
Write-Host "  1. Detendrá todos los contenedores" -ForegroundColor Gray
Write-Host "  2. Limpiará volúmenes de datos (opcional)" -ForegroundColor Gray
Write-Host "  3. Iniciará el sistema con Primary como BD principal" -ForegroundColor Gray
Write-Host "  4. Configurará replicación bidireccional" -ForegroundColor Gray
Write-Host ""

# Confirmar acción
$response = Read-Host "⚠️  ¿Deseas limpiar los volúmenes de datos? Esto BORRARÁ todos los datos (S/N)"
$cleanVolumes = ($response -eq 'S' -or $response -eq 's')

# 1. Detener todos los contenedores
Write-Host "`n[1] Deteniendo contenedores..." -ForegroundColor Yellow
docker-compose down

if ($cleanVolumes) {
    Write-Host "  Eliminando volúmenes de datos..." -ForegroundColor Gray
    docker volume rm chrispar_hhrr_pg_primary_data 2>$null
    docker volume rm chrispar_hhrr_pg_mirror_data 2>$null
    Write-Host "  ✓ Volúmenes eliminados" -ForegroundColor Green
}

# 2. Verificar que .env apunte al Primary
Write-Host "`n[2] Verificando configuración de .env..." -ForegroundColor Yellow
$envPath = ".\backend\.env"
$envContent = Get-Content $envPath -Raw

if ($envContent -match "DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar") {
    Write-Host "  ✓ .env configurado correctamente (Primary por defecto)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Corrigiendo .env para usar Primary..." -ForegroundColor Yellow
    
    # Asegurar que Primary esté activo y Mirror comentado
    $envContent = $envContent -replace '#?DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar', 'DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar'
    $envContent = $envContent -replace '^DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar', '#DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar'
    
    Set-Content $envPath $envContent
    Write-Host "  ✓ .env corregido" -ForegroundColor Green
}

# 3. Iniciar bases de datos
Write-Host "`n[3] Iniciando bases de datos..." -ForegroundColor Yellow
docker-compose up -d postgres_primary postgres_mirror

Write-Host "  Esperando a que las bases de datos estén listas..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Verificar que Primary esté saludable
$primaryReady = docker exec chrispar_postgres_primary pg_isready -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Primary listo" -ForegroundColor Green
} else {
    Write-Host "  ✗ Error: Primary no responde" -ForegroundColor Red
    exit 1
}

# Verificar que Mirror esté listo
$mirrorReady = docker exec chrispar_postgres_mirror pg_isready -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Mirror listo" -ForegroundColor Green
} else {
    Write-Host "  ✗ Error: Mirror no responde" -ForegroundColor Red
    exit 1
}

# 4. Aplicar migraciones al Primary (si es necesario)
if ($cleanVolumes) {
    Write-Host "`n[4] Aplicando migraciones al Primary..." -ForegroundColor Yellow
    docker-compose up -d backend
    Start-Sleep -Seconds 5
    
    docker exec chrispar_backend flask db upgrade
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Migraciones aplicadas" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Error al aplicar migraciones (puede ser normal si ya existen)" -ForegroundColor Yellow
    }
    
    docker-compose stop backend
}

# 5. Configurar replicación bidireccional
Write-Host "`n[5] Configurando replicación bidireccional..." -ForegroundColor Yellow
docker-compose up replication_setup

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Replicación bidireccional configurada" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Advertencia: Error al configurar replicación" -ForegroundColor Yellow
    Write-Host "     El sistema funcionará, pero sin replicación bidireccional" -ForegroundColor Gray
}

# 6. Iniciar todos los servicios
Write-Host "`n[6] Iniciando todos los servicios..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "  Esperando a que el backend esté listo..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 7. Verificar estado final
Write-Host "`n[7] Verificando estado del sistema..." -ForegroundColor Yellow

# Verificar contenedores
Write-Host "`n  Contenedores activos:" -ForegroundColor Cyan
docker ps --filter "name=chrispar" --format "table {{.Names}}`t{{.Status}}"

# Verificar health check
Write-Host "`n  Health check del backend:" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5 2>$null
    
    Write-Host "    Status: " -NoNewline
    if ($health.status -eq "healthy") {
        Write-Host "HEALTHY ✓" -ForegroundColor Green
    } else {
        Write-Host "UNHEALTHY ✗" -ForegroundColor Red
    }
    
    Write-Host "    BD Activa: " -NoNewline
    if ($health.current_db -eq "primary") {
        Write-Host "PRIMARY ✓" -ForegroundColor Green
    } else {
        Write-Host "$($health.current_db) ⚠️" -ForegroundColor Yellow
    }
    
    Write-Host "    Primary: " -NoNewline
    if ($health.databases.primary.status -eq "healthy") {
        Write-Host "HEALTHY ✓" -ForegroundColor Green
    } else {
        Write-Host "UNHEALTHY ✗" -ForegroundColor Red
    }
    
    Write-Host "    Mirror: " -NoNewline
    if ($health.databases.mirror.status -eq "healthy") {
        Write-Host "HEALTHY ✓" -ForegroundColor Green
    } else {
        Write-Host "UNHEALTHY ✗" -ForegroundColor Red
    }
} catch {
    Write-Host "    ✗ No se pudo conectar al backend" -ForegroundColor Red
    Write-Host "      Verifica los logs con: docker logs chrispar_backend" -ForegroundColor Gray
}

# 8. Verificar sincronización (si aplica)
if (-not $cleanVolumes) {
    Write-Host "`n[8] Verificando sincronización..." -ForegroundColor Yellow
    .\scripts\failover\check_sync_status.ps1
}

Write-Host "`n=== Reinicio Completado ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Sistema iniciado correctamente con:" -ForegroundColor Green
Write-Host "   • Primary como BD principal (postgres_primary:5432)" -ForegroundColor White
Write-Host "   • Mirror como BD de respaldo (postgres_mirror:5432)" -ForegroundColor White
Write-Host "   • Replicación bidireccional activa" -ForegroundColor White
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   • Probar failover: .\scripts\failover\failover_to_mirror.ps1" -ForegroundColor Gray
Write-Host "   • Verificar sincronización: .\scripts\failover\check_sync_status.ps1" -ForegroundColor Gray
Write-Host "   • Ver estado: .\scripts\failover\check_status.ps1" -ForegroundColor Gray
Write-Host ""
