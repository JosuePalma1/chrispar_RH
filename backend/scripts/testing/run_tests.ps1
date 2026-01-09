#!/usr/bin/env pwsh
# Script para ejecutar tests del backend con diferentes opciones

param(
    [string]$Mode = "all",  # all, unit, integration, e2e, coverage, fast
    [switch]$Watch,
    [switch]$Verbose,
    [switch]$Html
)

$BackendPath = "$PSScriptRoot"

Write-Host "🧪 Ejecutando tests del backend..." -ForegroundColor Cyan
Write-Host "📁 Ruta: $BackendPath" -ForegroundColor Gray
Write-Host ""

# Activar entorno virtual si existe
if (Test-Path "$BackendPath\venv\Scripts\Activate.ps1") {
    Write-Host "🐍 Activando entorno virtual..." -ForegroundColor Yellow
    & "$BackendPath\venv\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  No se encontró venv, usando Python del sistema" -ForegroundColor Yellow
}

# Cambiar al directorio backend
Set-Location $BackendPath

# Construir argumentos base
$PytestArgs = @("tests/")

if ($Verbose) {
    $PytestArgs += "-v"
} else {
    $PytestArgs += "-q"
}

# Modo de ejecución
switch ($Mode) {
    "unit" {
        Write-Host "🔬 Ejecutando tests unitarios..." -ForegroundColor Green
        $PytestArgs = @("tests/test_parsers.py", "tests/test_auth_utils.py", "tests/test_auth.py")
    }
    "integration" {
        Write-Host "🔗 Ejecutando tests de integración..." -ForegroundColor Green
        $PytestArgs = @(
            "tests/test_cargo_routes.py",
            "tests/test_empleado_routes.py",
            "tests/test_nomina_routes.py",
            "tests/test_usuario_routes.py",
            "tests/test_asistencia_routes.py"
        )
    }
    "e2e" {
        Write-Host "🌐 Ejecutando tests end-to-end..." -ForegroundColor Green
        $PytestArgs = @("tests/test_e2e_workflows.py")
    }
    "coverage" {
        Write-Host "📊 Ejecutando tests con cobertura..." -ForegroundColor Green
        $PytestArgs += @(
            "--cov=routes",
            "--cov=utils",
            "--cov=models",
            "--cov-report=term-missing"
        )
        if ($Html) {
            $PytestArgs += "--cov-report=html"
        }
    }
    "fast" {
        Write-Host "⚡ Ejecutando tests rápidos (sin warnings)..." -ForegroundColor Green
        $PytestArgs += @("--tb=no", "--disable-warnings")
    }
    default {
        Write-Host "🎯 Ejecutando todos los tests..." -ForegroundColor Green
    }
}

# Watch mode
if ($Watch) {
    Write-Host "👀 Modo watch activado (requiere pytest-watch)" -ForegroundColor Magenta
    pip install pytest-watch -q
    ptw -- $PytestArgs
} else {
    # Ejecutar pytest
    Write-Host ""
    python -m pytest @PytestArgs
}

# Resultado
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Tests completados exitosamente!" -ForegroundColor Green
    
    if ($Mode -eq "coverage" -and $Html) {
        Write-Host "📊 Abriendo reporte HTML..." -ForegroundColor Cyan
        Start-Process "$BackendPath\htmlcov\index.html"
    }
} else {
    Write-Host ""
    Write-Host "❌ Algunos tests fallaron" -ForegroundColor Red
    exit 1
}
