# ==========================================
# Script de Prueba de Replicación Bidireccional
# ==========================================

Write-Host "=== Prueba de Replicación Bidireccional ===" -ForegroundColor Cyan
Write-Host ""

# 1. Contar registros iniciales
Write-Host "[1] Contando registros iniciales..." -ForegroundColor Yellow
$primaryCount = docker exec chrispar_postgres_primary psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM usuarios;" | ForEach-Object { $_.Trim() }
$mirrorCount = docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM usuarios;" | ForEach-Object { $_.Trim() }

Write-Host "  Primary: $primaryCount usuarios" -ForegroundColor Gray
Write-Host "  Mirror: $mirrorCount usuarios" -ForegroundColor Gray

# 2. Insertar en Primary
Write-Host "`n[2] Insertando registro en PRIMARY..." -ForegroundColor Yellow
$testUsername = "test_primary_$(Get-Date -Format 'HHmmss')"
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO usuarios (username, email, password_hash, rol) VALUES ('$testUsername', 'test@primary.com', 'hash123', 'empleado');" | Out-Null

Write-Host "  ✓ Registro insertado en Primary: $testUsername" -ForegroundColor Green

# Esperar replicación
Write-Host "  Esperando replicación (3 segundos)..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Verificar en Mirror
$existsInMirror = docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM usuarios WHERE username='$testUsername';" | ForEach-Object { $_.Trim() }

if ($existsInMirror -eq "1") {
    Write-Host "  ✅ Replicación Primary → Mirror FUNCIONA" -ForegroundColor Green
} else {
    Write-Host "  ❌ Replicación Primary → Mirror FALLA" -ForegroundColor Red
}

# 3. Insertar en Mirror
Write-Host "`n[3] Insertando registro en MIRROR..." -ForegroundColor Yellow
$testUsername2 = "test_mirror_$(Get-Date -Format 'HHmmss')"
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "INSERT INTO usuarios (username, email, password_hash, rol) VALUES ('$testUsername2', 'test@mirror.com', 'hash456', 'empleado');" | Out-Null

Write-Host "  ✓ Registro insertado en Mirror: $testUsername2" -ForegroundColor Green

# Esperar replicación
Write-Host "  Esperando replicación (3 segundos)..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Verificar en Primary
$existsInPrimary = docker exec chrispar_postgres_primary psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM usuarios WHERE username='$testUsername2';" | ForEach-Object { $_.Trim() }

if ($existsInPrimary -eq "1") {
    Write-Host "  ✅ Replicación Mirror → Primary FUNCIONA" -ForegroundColor Green
} else {
    Write-Host "  ❌ Replicación Mirror → Primary FALLA" -ForegroundColor Red
    Write-Host "     Verificando suscripciones..." -ForegroundColor Yellow
    
    # Ver estado de suscripción en Primary
    Write-Host "`n  Suscripción en Primary:" -ForegroundColor Cyan
    docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT subname, subenabled, subslotname FROM pg_subscription;"
    
    Write-Host "`n  Verificando logs de replicación..." -ForegroundColor Cyan
    docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT slot_name, slot_type, active, restart_lsn FROM pg_replication_slots;"
}

# 4. Resumen final
Write-Host "`n[4] Conteo final..." -ForegroundColor Yellow
$primaryCountFinal = docker exec chrispar_postgres_primary psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM usuarios;" | ForEach-Object { $_.Trim() }
$mirrorCountFinal = docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM usuarios;" | ForEach-Object { $_.Trim() }

Write-Host "  Primary: $primaryCountFinal usuarios (antes: $primaryCount)" -ForegroundColor Gray
Write-Host "  Mirror: $mirrorCountFinal usuarios (antes: $mirrorCount)" -ForegroundColor Gray

if ($primaryCountFinal -eq $mirrorCountFinal) {
    Write-Host "`n✅ SINCRONIZACIÓN EXITOSA" -ForegroundColor Green
    Write-Host "   Ambas BDs tienen la misma cantidad de registros" -ForegroundColor White
} else {
    Write-Host "`n⚠️  SINCRONIZACIÓN INCOMPLETA" -ForegroundColor Yellow
    Write-Host "   Las BDs tienen diferente cantidad de registros" -ForegroundColor White
    Write-Host "   Diferencia: $([Math]::Abs($primaryCountFinal - $mirrorCountFinal)) registros" -ForegroundColor Gray
}

Write-Host "`n=== Fin de Prueba ===" -ForegroundColor Cyan
