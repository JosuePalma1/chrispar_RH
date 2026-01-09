#!/usr/bin/env pwsh
# ==============================================================================
# Script: reset_failover.ps1
# Descripción: Resetea el sistema de failover al estado inicial
# Uso: .\scripts\reset_failover.ps1
# ==============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESET DEL SISTEMA DE FAILOVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Este script hará lo siguiente:" -ForegroundColor Yellow
Write-Host "  1. Detendrá todos los contenedores" -ForegroundColor White
Write-Host "  2. Restaurará .env al estado inicial (primary)" -ForegroundColor White
Write-Host "  3. Limpiará volúmenes de base de datos" -ForegroundColor White
Write-Host "  4. Reconstruirá los contenedores" -ForegroundColor White
Write-Host "  5. Configurará la replicación desde cero`n" -ForegroundColor White

$confirmation = Read-Host "¿Deseas continuar? (S/N)"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "`nOperación cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n[1/5] Deteniendo contenedores..." -ForegroundColor Yellow
docker-compose down

Write-Host "`n[2/5] Restaurando archivo .env..." -ForegroundColor Yellow
$envPath = ".\backend\.env"
$envContent = Get-Content $envPath

# Buscar y reemplazar DATABASE_URL
$newEnvContent = $envContent | ForEach-Object {
    if ($_ -match "^DATABASE_URL=") {
        "DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar"
    } elseif ($_ -match "^#DATABASE_URL=postgresql://postgres:123@postgres_mirror") {
        "#DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar"
    } else {
        $_
    }
}

Set-Content -Path $envPath -Value $newEnvContent
Write-Host "✓ .env restaurado a primary" -ForegroundColor Green

Write-Host "`n[3/5] Limpiando volúmenes..." -ForegroundColor Yellow
docker volume rm chrispar_hhrr_pg_primary_data -f 2>$null
docker volume rm chrispar_hhrr_pg_mirror_data -f 2>$null
Write-Host "✓ Volúmenes eliminados" -ForegroundColor Green

Write-Host "`n[4/5] Iniciando contenedores..." -ForegroundColor Yellow
docker-compose up -d postgres_primary postgres_mirror
Write-Host "Esperando a que las bases de datos inicien (20 segundos)..."
Start-Sleep -Seconds 20

Write-Host "`n[5/5] Configurando replicación..." -ForegroundColor Yellow
docker-compose up replication_setup
Start-Sleep -Seconds 5

Write-Host "`nIniciando backend y frontend..." -ForegroundColor Yellow
docker-compose up -d backend frontend

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESET COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✓ Sistema restaurado al estado inicial" -ForegroundColor Green
Write-Host "✓ Usando PRIMARY como base de datos activa" -ForegroundColor Green
Write-Host "✓ Replicación configurada al MIRROR" -ForegroundColor Green
Write-Host "✓ Failover automático habilitado" -ForegroundColor Green

Write-Host "`nVerifica el estado con: " -NoNewline
Write-Host ".\scripts\check_status.ps1" -ForegroundColor Cyan

Write-Host "`n========================================`n" -ForegroundColor Cyan
