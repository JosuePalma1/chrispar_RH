# ==========================================
# Script de Failover Automático a Mirror
# ==========================================
# Este script realiza el proceso completo de failover desde 
# postgres_primary a postgres_mirror

Write-Host "=== Iniciando Failover a Mirror ===" -ForegroundColor Cyan

# 0. Verificar estado inicial
Write-Host "`n[0] Verificando estado de contenedores PostgreSQL..." -ForegroundColor Yellow
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

# 1. Detener la base de datos primary
Write-Host "`n[1] Deteniendo postgres_primary..." -ForegroundColor Yellow
docker stop chrispar_postgres_primary
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Primary detenido correctamente" -ForegroundColor Green
} else {
    Write-Host "✗ Error al detener primary" -ForegroundColor Red
    exit 1
}

# 2. Modificar .env para apuntar al mirror
Write-Host "`n[2] Modificando .env para apuntar al mirror..." -ForegroundColor Yellow
$envPath = ".\backend\.env"
$envContent = Get-Content $envPath -Raw

# Backup del .env original
$backupPath = ".\backend\.env.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $envPath $backupPath
Write-Host "  Backup creado en: $backupPath" -ForegroundColor Gray

# Cambiar DATABASE_URL al mirror
$envContent = $envContent -replace 'DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar', '#DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar'
$envContent = $envContent -replace '#DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar', 'DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar'

Set-Content $envPath $envContent
Write-Host "✓ .env modificado correctamente" -ForegroundColor Green

# 3. Reiniciar backend
Write-Host "`n[3] Reiniciando backend..." -ForegroundColor Yellow
docker-compose restart backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend reiniciado correctamente" -ForegroundColor Green
} else {
    Write-Host "✗ Error al reiniciar backend" -ForegroundColor Red
}

# 4. Esperar a que el backend esté listo
Write-Host "`n[4] Esperando a que backend esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 5. Deshabilitar la suscripción en el mirror
Write-Host "`n[5] Deshabilitando suscripción en mirror..." -ForegroundColor Yellow
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "DROP SUBSCRIPTION IF EXISTS chrispar_sub;"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Suscripción deshabilitada" -ForegroundColor Green
} else {
    Write-Host "⚠ Advertencia al deshabilitar suscripción (puede ser normal si ya estaba deshabilitada)" -ForegroundColor Yellow
}

# 6. Actualizar secuencias en el mirror
Write-Host "`n[6] Actualizando secuencias en mirror..." -ForegroundColor Yellow
$sequenceSQL = @"
SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE(MAX(id), 1)) FROM usuarios;
SELECT setval(pg_get_serial_sequence('empleados', 'id'), COALESCE(MAX(id), 1)) FROM empleados;
SELECT setval(pg_get_serial_sequence('cargos', 'id_cargo'), COALESCE(MAX(id_cargo), 1)) FROM cargos;
SELECT setval(pg_get_serial_sequence('horario', 'id_horario'), COALESCE(MAX(id_horario), 1)) FROM horario;
SELECT setval(pg_get_serial_sequence('asistencias', 'id_asistencia'), COALESCE(MAX(id_asistencia), 1)) FROM asistencias;
SELECT setval(pg_get_serial_sequence('permisos', 'id_permiso'), COALESCE(MAX(id_permiso), 1)) FROM permisos;
SELECT setval(pg_get_serial_sequence('nominas', 'id_nomina'), COALESCE(MAX(id_nomina), 1)) FROM nominas;
SELECT setval(pg_get_serial_sequence('rubros', 'id_rubro'), COALESCE(MAX(id_rubro), 1)) FROM rubros;
SELECT setval(pg_get_serial_sequence('hoja_vida', 'id_hoja_vida'), COALESCE(MAX(id_hoja_vida), 1)) FROM hoja_vida;
SELECT setval(pg_get_serial_sequence('log_transaccional', 'id'), COALESCE(MAX(id), 1)) FROM log_transaccional;
"@

docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c $sequenceSQL
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Secuencias actualizadas correctamente" -ForegroundColor Green
} else {
    Write-Host "✗ Error al actualizar secuencias" -ForegroundColor Red
}

# 7. Verificar estado final
Write-Host "`n[7] Verificando estado final..." -ForegroundColor Yellow
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host "`n=== Failover Completado ===" -ForegroundColor Cyan
Write-Host "El sistema ahora está usando postgres_mirror como base de datos principal." -ForegroundColor Green
Write-Host "`nPara revertir al primary, ejecuta: .\scripts\failback_to_primary.ps1" -ForegroundColor Gray
