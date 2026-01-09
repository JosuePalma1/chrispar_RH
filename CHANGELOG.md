# 📜 Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Sin versión] - 2026-01-08

### ✨ Añadido
- Sistema de failover automático on-demand
- Failover transparente entre primary y mirror
- Reorganización profesional de la estructura del proyecto
- Documentación completa en carpeta `docs/`
- Scripts organizados por categorías
- Sistema de testing con 186 tests (88% coverage)
- Replicación de base de datos con PostgreSQL logical replication
- API REST completa con autenticación JWT
- Frontend React con gestión de empleados, nóminas, asistencias

### 🔄 Cambiado
- Estructura de documentación movida a `docs/`
- Scripts reorganizados en `scripts/database/`, `scripts/failover/`, etc.
- Configuración de failover simplificada (solo 2 variables)
- Sistema de failover de background a on-demand (más eficiente)

### 🗂️ Organización
- `docs/` - Toda la documentación
  - `features/failover/` - Documentación de alta disponibilidad
  - `features/mirror-db/` - Replicación de BD
  - `configuration/` - Configuración del sistema
  - `testing/` - Guías de testing
- `scripts/` - Scripts organizados por funcionalidad
  - `database/` - Gestión de BD
  - `failover/` - Alta disponibilidad
  - `maintenance/` - Mantenimiento
  - `demo/` - Demostraciones
- `backend/scripts/` - Scripts específicos del backend
  - `load_testing/` - Tests de carga
  - `testing/` - Scripts de testing

### 🐛 Corregido
- Estructura desorganizada del proyecto
- Documentación dispersa en raíz
- Scripts mezclados sin categorización

## [Próximos cambios]

### 🎯 Planeado
- Sistema de notificaciones de failover
- Dashboard de monitoreo
- Backups automáticos
- Logs centralizados
- Métricas de rendimiento