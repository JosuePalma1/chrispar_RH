# 🧪 Guía Rápida de Testing

## Comandos Principales

### Ejecutar todos los tests
```bash
python -m pytest tests/ -v
```

### Con cobertura (recomendado)
```bash
pytest tests/ --cov=routes --cov=utils --cov=models --cov-report=html
```

### Script PowerShell (Windows)
```powershell
# Todos los tests
.\run_tests.ps1

# Solo unitarios
.\run_tests.ps1 -Mode unit

# Con cobertura y reporte HTML
.\run_tests.ps1 -Mode coverage -Html

# Tests rápidos (sin warnings)
.\run_tests.ps1 -Mode fast
```

## Estructura de Tests

```
tests/
├── conftest.py              # Fixtures compartidos
├── test_parsers.py          # 12 tests unitarios
├── test_auth_utils.py       # 3 tests unitarios
├── test_auth.py             # 2 tests de autenticación
├── test_cargo_routes.py     # 10 tests integración
├── test_empleado_routes.py  # 6 tests integración
├── test_nomina_routes.py    # 6 tests integración
├── test_usuario_routes.py   # 10 tests integración
├── test_asistencia_routes.py# 6 tests integración
└── test_e2e_workflows.py    # 4 tests E2E
```

## Fixtures Disponibles

```python
def test_mi_endpoint(client, auth_headers, app, cargo_fixture):
    # client: Cliente HTTP para requests
    # auth_headers: Headers con token JWT de admin
    # app: Instancia de Flask configurada
    # cargo_fixture: ID de un cargo pre-creado
    
    response = client.get('/api/mi-endpoint', headers=auth_headers)
    assert response.status_code == 200
```

## Estado Actual

| Métrica | Valor |
|---------|-------|
| Tests totales | 58 |
| Tests pasando | 58 ✅ |
| Cobertura | 63% |
| Tiempo ejecución | ~11s |

## Por Módulo

| Módulo | Cobertura | Tests |
|--------|-----------|-------|
| Empleados | 84% | 6 |
| Nóminas | 80% | 6 |
| Asistencias | 75% | 6 |
| Cargos | 75% | 10 |
| Usuarios | 71% | 10 |
| Auth Utils | 75% | 3 |
| Parsers | 100% | 12 |

## Agregar Nuevos Tests

### 1. Test Unitario
```python
# tests/test_mi_utilidad.py
def test_mi_funcion():
    """Debe hacer X cosa"""
    from utils.mi_utilidad import mi_funcion
    
    resultado = mi_funcion("entrada")
    assert resultado == "esperado"
```

### 2. Test de Integración
```python
# tests/test_mi_routes.py
class TestMiCRUD:
    def test_crear_registro(self, client, auth_headers):
        """POST /api/mi-endpoint debe crear registro"""
        response = client.post(
            '/api/mi-endpoint',
            json={'campo': 'valor'},
            headers=auth_headers
        )
        assert response.status_code == 201
```

### 3. Test E2E
```python
# tests/test_e2e_workflows.py
def test_flujo_completo(self, client, app):
    """Flujo: login → crear → listar → eliminar"""
    # 1. Login
    response = client.post('/api/usuarios/login', json={...})
    token = response.json['token']
    
    # 2. Crear recurso
    response = client.post('/api/recurso', json={...}, 
                          headers={'Authorization': f'Bearer {token}'})
    # ...continuar flujo
```

## CI/CD

Los tests se ejecutan automáticamente en:
- ✅ Cada push a `main` o `develop`
- ✅ Cada Pull Request
- ✅ Múltiples versiones de Python (3.10, 3.11, 3.12)

## Troubleshooting

### Error: No module named 'pytest'
```bash
pip install pytest pytest-cov
```

### Tests fallan por BD
Los tests usan SQLite en memoria, no necesitas PostgreSQL corriendo.

### ImportError en fixtures
Verifica que `conftest.py` esté en el directorio `tests/`.

### Warnings excesivos
```bash
pytest tests/ --disable-warnings
```

## Recursos

- 📄 [Reporte Completo](TESTING_REPORT.md)
- 📊 [Cobertura HTML](htmlcov/index.html)
- 📝 [Configuración pytest.ini](pytest.ini)
- 🔧 [Fixtures](tests/conftest.py)
