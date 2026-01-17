# ==========================================
# Script de Verificación de Sincronización
# ==========================================
# Este script verifica el estado de la replicación bidireccional
# entre postgres_primary y postgres_mirror

Write-Host "=== Verificación de Sincronización Bidireccional ===" -ForegroundColor Cyan
Write-Host ""

# Función para contar registros en una tabla
function Get-TableCount {
    param(
        [string]$Container,
        [string]$Table
    )
    
    $count = docker exec $Container psql -U postgres -d chrispar -t -c "SELECT COUNT(*) FROM $Table;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        return $count.Trim()
    } else {
        return "ERROR"
    }
}

# Función para verificar estado de suscripciones
function Get-SubscriptionStatus {
    param(
        [string]$Container,
        [string]$DBName
    )
    
    Write-Host "  📊 Suscripciones en $DBName :" -ForegroundColor Cyan
    docker exec $Container psql -U postgres -d chrispar -c "SELECT subname, subenabled, subslotname FROM pg_subscription;" 2>$null
}

# Función para verificar estado de publicaciones
function Get-PublicationStatus {
    param(
        [string]$Container,
        [string]$DBName
    )
    
    Write-Host "  📰 Publicaciones en $DBName :" -ForegroundColor Cyan
    docker exec $Container psql -U postgres -d chrispar -c "SELECT pubname FROM pg_publication;" 2>$null
}

# 1. Verificar estado de contenedores
Write-Host "[1] Estado de Contenedores" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
docker ps --filter "name=postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
Write-Host ""

# 2. Verificar conectividad
Write-Host "[2] Verificando Conectividad" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$primaryStatus = docker exec chrispar_postgres_primary pg_isready -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Primary: Conectado" -ForegroundColor Green
    $primaryOnline = $true
} else {
    Write-Host "  ✗ Primary: No disponible" -ForegroundColor Red
    $primaryOnline = $false
}

$mirrorStatus = docker exec chrispar_postgres_mirror pg_isready -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Mirror: Conectado" -ForegroundColor Green
    $mirrorOnline = $true
} else {
    Write-Host "  ✗ Mirror: No disponible" -ForegroundColor Red
    $mirrorOnline = $false
}
Write-Host ""

# 3. Verificar configuración de replicación
Write-Host "[3] Configuración de Replicación" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($primaryOnline) {
    Get-PublicationStatus -Container "chrispar_postgres_primary" -DBName "Primary"
    Write-Host ""
    Get-SubscriptionStatus -Container "chrispar_postgres_primary" -DBName "Primary"
    Write-Host ""
}

if ($mirrorOnline) {
    Get-PublicationStatus -Container "chrispar_postgres_mirror" -DBName "Mirror"
    Write-Host ""
    Get-SubscriptionStatus -Container "chrispar_postgres_mirror" -DBName "Mirror"
    Write-Host ""
}

# 4. Comparar conteo de registros en tablas críticas
Write-Host "[4] Comparación de Datos" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$tables = @("usuario", "empleado", "cargo", "asistencia", "nomina")

Write-Host ""
Write-Host "  Tabla          | Primary | Mirror  | Estado" -ForegroundColor Cyan
Write-Host "  ───────────────|─────────|─────────|─────────" -ForegroundColor Gray

$allSynced = $true
foreach ($table in $tables) {
    $primaryCount = "N/A"
    $mirrorCount = "N/A"
    
    if ($primaryOnline) {
        $primaryCount = Get-TableCount -Container "chrispar_postgres_primary" -Table $table
    }
    
    if ($mirrorOnline) {
        $mirrorCount = Get-TableCount -Container "chrispar_postgres_mirror" -Table $table
    }
    
    $status = ""
    $statusColor = "White"
    
    if ($primaryCount -eq $mirrorCount -and $primaryCount -ne "N/A" -and $primaryCount -ne "ERROR") {
        $status = "✓ Sync"
        $statusColor = "Green"
    } elseif ($primaryCount -eq "ERROR" -or $mirrorCount -eq "ERROR") {
        $status = "✗ Error"
        $statusColor = "Red"
        $allSynced = $false
    } else {
        $status = "⚠ Diff"
        $statusColor = "Yellow"
        $allSynced = $false
    }
    
    $tablePadded = $table.PadRight(15)
    $primaryPadded = $primaryCount.ToString().PadRight(7)
    $mirrorPadded = $mirrorCount.ToString().PadRight(7)
    
    Write-Host "  $tablePadded| $primaryPadded| $mirrorPadded| " -NoNewline
    Write-Host "$status" -ForegroundColor $statusColor
}
Write-Host ""

# 5. Estado de replicación WAL
Write-Host "[5] Estado de Replicación WAL" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($primaryOnline) {
    Write-Host "  📡 Slots de Replicación en Primary:" -ForegroundColor Cyan
    docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT slot_name, slot_type, active, restart_lsn FROM pg_replication_slots;" 2>$null
    Write-Host ""
}

if ($mirrorOnline) {
    Write-Host "  📡 Slots de Replicación en Mirror:" -ForegroundColor Cyan
    docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT slot_name, slot_type, active, restart_lsn FROM pg_replication_slots;" 2>$null
    Write-Host ""
}

# 6. Resumen final
Write-Host "[6] Resumen" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($primaryOnline -and $mirrorOnline) {
    if ($allSynced) {
        Write-Host "  ✅ Las bases de datos están sincronizadas" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Las bases de datos tienen diferencias" -ForegroundColor Yellow
        Write-Host "     Esto es normal si acabas de hacer cambios." -ForegroundColor Gray
        Write-Host "     Espera unos segundos y vuelve a verificar." -ForegroundColor Gray
    }
} elseif ($primaryOnline -or $mirrorOnline) {
    Write-Host "  ⚠️  Solo una base de datos está activa" -ForegroundColor Yellow
    Write-Host "     Los cambios se sincronizarán cuando ambas estén arriba" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Ninguna base de datos está disponible" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Fin de Verificación ===" -ForegroundColor Cyan
