# 🧪 Tests Directory

Esta carpeta contiene todos los tests automatizados del backend del Sistema de RRHH ChrisPar.

## 📊 Estado Actual

```
✅ 127 tests pasando (100%)
🎯 84% cobertura global (+3% adicional)
⚡ ~60 segundos de ejecución
🚀 Performance testing con Locust configurado
```

## 📁 Estructura de Archivos

### Tests Unitarios
- `test_parsers.py` - Tests de funciones de parseo (12 tests)
- `test_auth_utils.py` - Tests de utilidades de autenticación (3 tests)
- `test_auth.py` - Tests de login básico (2 tests)

### Tests de Integración (CRUD)
- `test_log_transaccional_routes.py` - Endpoints de logs (17 tests) ⭐ NUEVO
- `test_permiso_routes.py` - Endpoints de permisos (13 tests) ⭐
- `test_rubro_routes.py` - Endpoints de rubros (12 tests) ⭐
- `test_hoja_vida_routes.py` - Endpoints de hojas de vida (11 tests) ⭐
- `test_horario_routes.py` - Endpoints de horarios (10 tests) ⭐
- `test_usuario_routes.py` - Endpoints de usuarios + login (10 tests)
- `test_cargo_routes.py` - Endpoints de cargos (9 tests)
- `test_empleado_routes.py` - Endpoints de empleados (6 tests)
- `test_nomina_routes.py` - Endpoints de nóminas (6 tests)
- `test_asistencia_routes.py` - Endpoints de asistencias (6 tests)

### Tests End-to-End
- `test_e2e_workflows.py` - Flujos completos del sistema (10 tests) ⭐ AMPLIADO

### Configuración
- `conftest.py` - Fixtures compartidos y configuración de pytest

## 🚀 Ejecutar Tests

### Comando Básico
```bash
pytest tests/ -v
```

### Con Cobertura
```bash
pytest tests/ --cov=routes --cov=models --cov=utils --cov-report=html
```

### Por Categoría
```bash
# Solo unitarios
pytest tests/ -m unit

# Solo integración
pytest tests/ -m integration

# Solo E2E
pytest tests/ -m e2e
```

### Tests Específicos
```bash
# Un archivo
pytest tests/test_permiso_routes.py -v

# Un test específico
pytest tests/test_permiso_routes.py::TestPermisoRoutes::test_crear_permiso_exitoso -v
```

### Usando PowerShell Script
```powershell
# Todos los tests
.\run_tests.ps1

# Con cobertura
.\run_tests.ps1 -Mode coverage

# Solo rápidos (sin E2E)
.\run_tests.ps1 -Mode fast
```

## 🔧 Fixtures Disponibles

Definidos en `conftest.py`:

- **`app`** - Aplicación Flask configurada con SQLite in-memory
- **`client`** - Cliente de prueba para hacer requests HTTP
- **`admin_token`** - Token JWT de usuario administrador
- **`auth_headers`** - Headers con token para requests autenticados
- **`cargo_fixture`** - Cargo de prueba creado automáticamente

## 📝 Convenciones de Naming

### Archivos
- `test_<modulo>_routes.py` - Tests de endpoints
- `test_<modulo>.py` - Tests de modelos o utilidades

### Clases
- `TestNombreRoutes` - Agrupa tests de endpoints relacionados

### Funciones
- `test_<accion>_<escenario>` - Descripción clara de lo que se prueba
  - Ejemplo: `test_crear_permiso_sin_fecha_inicio`

### Markers
- `@pytest.mark.unit` - Tests unitarios
- `@pytest.mark.integration` - Tests de integración
- `@pytest.mark.e2e` - Tests end-to-end

## ✅ Checklist para Nuevos Tests

Cuando agregues tests nuevos, asegúrate de:

- [ ] Usar fixtures existentes (no duplicar código)
- [ ] Incluir docstring explicando qué se prueba
- [ ] Marcar con `@pytest.mark.<categoria>`
- [ ] Validar códigos de respuesta HTTP
- [ ] Verificar estructura de respuesta JSON
- [ ] Incluir tests de casos edge
- [ ] Probar validaciones de negocio
- [ ] Testear tanto casos exitosos como fallidos

## 🎯 Cobertura por Módulo

| Módulo | Cobertura | Tests |
|--------|-----------|-------|
| Modelos | 98% | ✅ |
| Routes | 80% | ✅ |
| Utils | 87% | ✅ |

Ver `TESTING_REPORT.md` para detalles completos.

## 🐛 Debugging Tests

### Ver output completo
```bash
pytest tests/test_permiso_routes.py -v -s
```

### Detener en primer error
```bash
pytest tests/ -x
```

### Modo verbose con traceback
```bash
pytest tests/ -vv --tb=long
```

### Ejecutar tests que fallaron
```bash
pytest tests/ --lf
```

## 📚 Recursos

- **Documentación pytest**: https://docs.pytest.org/
- **Flask Testing**: https://flask.palletsprojects.com/en/2.3.x/testing/
- **Coverage.py**: https://coverage.readthedocs.io/

## 🔄 Actualizado

**Última actualización:** 2 de Diciembre, 2025  
**Mantenido por:** Equipo ChrisPar RRHH
