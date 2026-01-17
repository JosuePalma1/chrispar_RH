# ==========================================
# Script de Failback al Primary
# ==========================================
# Este script restaura la configuración original
# volviendo a usar postgres_primary
# ⚠️ IMPORTANTE: Con replicación bidireccional, los datos 
#    del Mirror ya se sincronizaron automáticamente al Primary

Write-Host "=== Iniciando Failback a Primary ===" -ForegroundColor Cyan
Write-Host "Con replicación bidireccional activa" -ForegroundColor Gray

# 1. Iniciar postgres_primary
Write-Host "`n[1] Iniciando postgres_primary..." -ForegroundColor Yellow
docker start chrispar_postgres_primary
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Primary iniciado correctamente" -ForegroundColor Green
} else {
    Write-Host "✗ Error al iniciar primary" -ForegroundColor Red
    exit 1
}

# Esperar a que el primary esté listo
Write-Host "  Esperando a que primary esté listo..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# 2. Verificar que primary esté saludable
Write-Host "`n[2] Verificando salud del primary..." -ForegroundColor Yellow
$healthCheck = docker exec chrispar_postgres_primary pg_isready -U postgres
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Primary está saludable" -ForegroundColor Green
} else {
    Write-Host "✗ Primary no responde" -ForegroundColor Red
    exit 1
}

# 2.5. Verificar estado de sincronización
Write-Host "`n[2.5] Verificando sincronización de datos..." -ForegroundColor Yellow
Write-Host "  Esperando a que la replicación bidireccional se sincronice..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host "  Verificando suscripciones activas..." -ForegroundColor Gray
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT subname, subenabled, subslotname FROM pg_subscription;" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Replicación bidireccional activa en Primary" -ForegroundColor Green
} else {
    Write-Host "⚠️  Advertencia: No se detectó replicación bidireccional" -ForegroundColor Yellow
    Write-Host "   Los datos del Mirror NO se sincronizarán automáticamente" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas continuar de todos modos? (S/N)"
    if ($response -ne 'S' -and $response -ne 's') {
        Write-Host "Failback cancelado" -ForegroundColor Red
        exit 1
    }
}

# 3. Restaurar .env al primary
Write-Host "`n[3] Restaurando .env al primary..." -ForegroundColor Yellow
$envPath = ".\backend\.env"
$envContent = Get-Content $envPath -Raw

# Backup del .env actual (mirror)
$backupPath = ".\backend\.env.mirror_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $envPath $backupPath
Write-Host "  Backup creado en: $backupPath" -ForegroundColor Gray

# Cambiar DATABASE_URL al primary
$envContent = $envContent -replace '#DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar', 'DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar'
$envContent = $envContent -replace 'DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar', '#DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar'

Set-Content $envPath $envContent
Write-Host "✓ .env restaurado correctamente" -ForegroundColor Green

# 4. Reiniciar backend
Write-Host "`n[4] Reiniciando backend..." -ForegroundColor Yellow
docker restart chrispar_backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend reiniciado correctamente" -ForegroundColor Green
} else {
    Write-Host "✗ Error al reiniciar backend" -ForegroundColor Red
}

# 5. Esperar a que el backend esté listo
Write-Host "`n[5] Esperando a que backend esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 6. Reconfigurar replicación (opcional)
Write-Host "`n[6] ¿Deseas reconfigurar la replicación? (S/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq 'S' -or $response -eq 's') {
    Write-Host "  Reconfigurando replicación..." -ForegroundColor Gray
    docker-compose up -d replication_setup
    Start-Sleep -Seconds 10
    Write-Host "✓ Replicación reconfigurada" -ForegroundColor Green
} else {
    Write-Host "  Replicación no reconfigurada (puedes hacerlo manualmente después)" -ForegroundColor Gray
}

# 7. Verificar estado final
Write-Host "`n[7] Verificando estado final..." -ForegroundColor Yellow
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host "`n=== Failback Completado ===" -ForegroundColor Cyan
Write-Host "El sistema ahora está usando postgres_primary como base de datos principal." -ForegroundColor Green
