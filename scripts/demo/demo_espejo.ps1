# Script de Demostración: Base de Datos Espejo (Mirror)
# Sistema CHRISPAR HHRR
# Este script demuestra la replicación en tiempo real entre postgres_primary y postgres_mirror

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DEMOSTRACIÓN: BASE DE DATOS ESPEJO CON REPLICACIÓN LÓGICA   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. VERIFICAR QUE AMBOS CONTENEDORES ESTÁN EJECUTÁNDOSE
Write-Host "═══ 1. VERIFICANDO CONTENEDORES POSTGRESQL ═══`n" -ForegroundColor Yellow
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
Read-Host "`nPresiona Enter para continuar"

# 2. VERIFICAR CONFIGURACIÓN DE REPLICACIÓN
Write-Host "`n═══ 2. CONFIGURACIÓN DE REPLICACIÓN ═══`n" -ForegroundColor Yellow
Write-Host "--- Publicación en PRIMARY ---" -ForegroundColor Cyan
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT pubname, puballtables FROM pg_publication;"
Write-Host "`n--- Suscripción en MIRROR ---" -ForegroundColor Green
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT subname, subenabled, subslotname FROM pg_subscription;"
Read-Host "`nPresiona Enter para continuar"

# 3. COMPARAR DATOS ENTRE PRIMARY Y MIRROR
Write-Host "`n═══ 3. COMPARANDO DATOS ENTRE PRIMARY Y MIRROR ═══`n" -ForegroundColor Yellow
Write-Host "--- PRIMARY DATABASE ---" -ForegroundColor Cyan
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT COUNT(*) as usuarios FROM usuarios; SELECT COUNT(*) as empleados FROM empleados; SELECT COUNT(*) as cargos FROM cargos; SELECT COUNT(*) as horarios FROM horario;"
Write-Host "`n--- MIRROR DATABASE ---" -ForegroundColor Green
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT COUNT(*) as usuarios FROM usuarios; SELECT COUNT(*) as empleados FROM empleados; SELECT COUNT(*) as cargos FROM cargos; SELECT COUNT(*) as horarios FROM horario;"
Read-Host "`nPresiona Enter para continuar"

# 4. DEMOSTRAR REPLICACIÓN EN TIEMPO REAL
Write-Host "`n═══ 4. DEMOSTRACIÓN DE REPLICACIÓN EN TIEMPO REAL ═══`n" -ForegroundColor Yellow
Write-Host "Insertando nuevo cargo en PRIMARY..." -ForegroundColor Cyan
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO cargos (nombre_cargo, sueldo_base, fecha_creacion) VALUES ('Demo Replicación', 2500.00, NOW()) RETURNING id_cargo, nombre_cargo, sueldo_base;"
Write-Host "`nEsperando 2 segundos para la replicación..." -ForegroundColor Magenta
Start-Sleep -Seconds 2
Write-Host "`nVerificando en MIRROR..." -ForegroundColor Green
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT id_cargo, nombre_cargo, sueldo_base, fecha_creacion FROM cargos WHERE nombre_cargo = 'Demo Replicación';"
Read-Host "`nPresiona Enter para continuar"

# 5. DEMOSTRAR INDEPENDENCIA: APAGAR MIRROR Y SINCRONIZACIÓN AUTOMÁTICA
Write-Host "`n═══ 5. DEMOSTRACIÓN DE INDEPENDENCIA Y AUTO-SINCRONIZACIÓN ═══`n" -ForegroundColor Yellow
Write-Host "Paso 1: Apagando MIRROR..." -ForegroundColor Red
docker stop chrispar_postgres_mirror
Start-Sleep -Seconds 2
Write-Host "`nPaso 2: Modificando datos en PRIMARY (mientras MIRROR está apagado)..." -ForegroundColor Cyan
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "UPDATE cargos SET sueldo_base = 3000.00 WHERE nombre_cargo = 'Demo Replicación' RETURNING nombre_cargo, sueldo_base;"
Write-Host "`nPaso 3: Encendiendo MIRROR..." -ForegroundColor Green
docker start chrispar_postgres_mirror
Write-Host "Esperando 5 segundos para sincronización..." -ForegroundColor Magenta
Start-Sleep -Seconds 5
Write-Host "`nPaso 4: Verificando sincronización automática en MIRROR..." -ForegroundColor Green
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT nombre_cargo, sueldo_base FROM cargos WHERE nombre_cargo = 'Demo Replicación';"
Read-Host "`nPresiona Enter para continuar"

# 6. ELIMINAR DATOS DE PRUEBA
Write-Host "`n═══ 6. LIMPIANDO DATOS DE DEMOSTRACIÓN ═══`n" -ForegroundColor Yellow
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "DELETE FROM cargos WHERE nombre_cargo = 'Demo Replicación';"
Write-Host "Esperando replicación de eliminación..." -ForegroundColor Magenta
Start-Sleep -Seconds 2
Write-Host "`nVerificando eliminación en MIRROR..." -ForegroundColor Green
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT COUNT(*) as registros_demo FROM cargos WHERE nombre_cargo = 'Demo Replicación';"

# 7. VERIFICACIÓN FINAL
Write-Host "`n═══ 7. VERIFICACIÓN FINAL - TABLAS EN MIRROR ═══`n" -ForegroundColor Yellow
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "\dt"

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEMOSTRACIÓN COMPLETADA EXITOSAMENTE             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Resumen de lo demostrado:" -ForegroundColor Cyan
Write-Host "✓ Dos contenedores PostgreSQL ejecutándose independientemente" -ForegroundColor Green
Write-Host "✓ Configuración de publicación y suscripción (replicación lógica)" -ForegroundColor Green
Write-Host "✓ Mismos datos en ambas bases de datos" -ForegroundColor Green
Write-Host "✓ Replicación en tiempo real (INSERT)" -ForegroundColor Green
Write-Host "✓ Sincronización automática después de desconexión" -ForegroundColor Green
Write-Host "✓ Replicación de actualizaciones (UPDATE)" -ForegroundColor Green
Write-Host "✓ Replicación de eliminaciones (DELETE)`n" -ForegroundColor Green
