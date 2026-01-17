# ==========================================
# Script de Verificación y Corrección Rápida
# ==========================================
# Este script verifica y corrige la configuración sin borrar datos

Write-Host "=== Verificación del Sistema ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar archivo .env
Write-Host "[1] Verificando archivo .env..." -ForegroundColor Yellow
$envPath = ".\backend\.env"
$envContent = Get-Content $envPath -Raw

$primaryActive = $envContent -match "^DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar"
$mirrorCommented = $envContent -match "#DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar"

if ($primaryActive) {
    Write-Host "  ✓ .env correctamente configurado (Primary activo)" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env mal configurado" -ForegroundColor Red
    Write-Host "  Corrigiendo..." -ForegroundColor Yellow
    
    # Comentar línea del mirror si está activa
    $envContent = $envContent -replace "^DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar", "#DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar"
    
    # Descomentar línea del primary si está comentada
    $envContent = $envContent -replace "#DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar", "DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar"
    
    Set-Content $envPath $envContent
    Write-Host "  ✓ .env corregido" -ForegroundColor Green
    $needsRestart = $true
}

# 2. Verificar variables de entorno del contenedor
Write-Host "`n[2] Verificando variables dentro del contenedor..." -ForegroundColor Yellow
$containerEnv = docker exec chrispar_backend env 2>$null | Select-String "^DATABASE_URL"

if ($containerEnv -match "postgres_primary") {
    Write-Host "  ✓ Contenedor usando Primary" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Contenedor NO está usando Primary" -ForegroundColor Yellow
    Write-Host "     Es necesario reiniciar el backend" -ForegroundColor Gray
    $needsRestart = $true
}

# 3. Verificar estado de contenedores
Write-Host "`n[3] Estado de contenedores PostgreSQL..." -ForegroundColor Yellow
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}"

$primaryRunning = docker ps --filter "name=chrispar_postgres_primary" --format "{{.Names}}" 2>$null
$mirrorRunning = docker ps --filter "name=chrispar_postgres_mirror" --format "{{.Names}}" 2>$null

if ($primaryRunning) {
    Write-Host "  ✓ Primary ejecutándose" -ForegroundColor Green
} else {
    Write-Host "  ✗ Primary NO está ejecutándose" -ForegroundColor Red
}

if ($mirrorRunning) {
    Write-Host "  ✓ Mirror ejecutándose" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Mirror NO está ejecutándose" -ForegroundColor Yellow
}

# 4. Reiniciar backend si es necesario
if ($needsRestart) {
    Write-Host "`n[4] Reiniciando backend para aplicar cambios..." -ForegroundColor Yellow
    docker-compose restart backend
    
    Write-Host "  Esperando a que el backend esté listo..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    Write-Host "  ✓ Backend reiniciado" -ForegroundColor Green
} else {
    Write-Host "`n[4] No es necesario reiniciar" -ForegroundColor Green
}

# 5. Verificar endpoint de health (si está disponible)
Write-Host "`n[5] Verificando conexión del backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/usuarios" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ Backend respondiendo correctamente" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Backend no responde o requiere autenticación" -ForegroundColor Yellow
    Write-Host "     Verifica los logs: docker logs chrispar_backend" -ForegroundColor Gray
}

# 6. Instrucciones finales
Write-Host "`n=== Verificación Completada ===" -ForegroundColor Cyan
Write-Host ""

if (-not $needsRestart -and $primaryActive -and $primaryRunning) {
    Write-Host "✅ Sistema correctamente configurado" -ForegroundColor Green
    Write-Host ""
    Write-Host "El sistema debería mostrar:" -ForegroundColor White
    Write-Host "  • Primary: postgres_primary:5432/chrispar" -ForegroundColor Gray
    Write-Host "  • Mirror: postgres_mirror:5432/chrispar" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Se realizaron correcciones" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor White
    Write-Host "  1. Recarga la página web (Ctrl+F5)" -ForegroundColor Gray
    Write-Host "  2. Verifica que Primary muestre postgres_primary" -ForegroundColor Gray
    Write-Host "  3. Si sigue mal, ejecuta: .\scripts\failover\reset_and_restart.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📝 Comandos útiles:" -ForegroundColor Yellow
Write-Host "  • Ver logs del backend: docker logs chrispar_backend -f" -ForegroundColor Gray
Write-Host "  • Reiniciar backend: docker-compose restart backend" -ForegroundColor Gray
Write-Host "  • Verificar sincronización: .\scripts\failover\check_sync_status.ps1" -ForegroundColor Gray
Write-Host ""
