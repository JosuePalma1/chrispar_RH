# 🏢 Chrispar HR · Sistema de Gestión de Recursos Humanos

Aplicación web full-stack (Flask + React) para centralizar los procesos de RR. HH. de Chrispar Market.


## 📚 Tabla de Contenidos


## 🧭 Resumen del Proyecto
- Plataforma interna para administrar empleados, cargos, usuarios, nóminas, horarios, asistencias y más
- Autenticación JWT con permisos basados en roles
- Backend REST API + frontend SPA
- 186 tests automatizados con 88% de cobertura
- Migraciones de base de datos con Alembic

---

## 🏗️ Arquitectura y Stack

| --- | --- | --- |
| Backend | Python 3.12, Flask 2.2.5 | SQLAlchemy, JWT, CORS, Blueprints |
| Base de Datos | PostgreSQL 14+ | Migraciones con Flask-Migrate/Alembic |
| Frontend | React 19, React Router 6 | Create React App, Axios |
| Testing | Pytest, React Testing Library | 186 tests backend, 20 tests frontend |
| CI/CD | GitHub Actions | Tests automáticos en Python 3.10/3.11/3.12 |

chrispar_HHRR/
├── README.md                   # Este archivo
├── docs/                       # 📚 Documentación completa
│   ├── features/               # Funcionalidades
│   │   ├── failover/          # Alta disponibilidad
│   │   └── mirror-db/         # Replicación de BD
│   ├── deployment/             # Despliegue
│   └── demo/                  # Demostraciones
│
│   ├── extensions.py          # Inicialización + Failover
│   ├── models/                # Modelos SQLAlchemy
│   ├── routes/                # Blueprints de endpoints
│   ├── utils/                 # Helpers (auth, parsers)
│   ├── tests/                 # 186 tests con pytest
│   ├── migrations/            # Migraciones de Alembic
│   ├── seeders/               # Datos de prueba
│   ├── scripts/               # Scripts del backend
│   │   └── testing/          # Scripts de testing
│   └── requirements.txt
│
│   ├── public/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── App.js             # Rutas principales
│   │   └── __tests__/         # Tests con Jest
│   └── package.json
│
└── docker/
    ├── backups/               # Backups de BD
    ├── replication/           # Scripts de replicación
    └── restore_backup.sh
```

> 📖 **Ver documentación completa**: [docs/README.md](docs/README.md)

---

## ✅ Requisitos Previos
- **Git** 2.x
- **Python** 3.12 (recomendado usar entorno virtual)
- **Node.js** 18+ y **npm** 9+
- **PostgreSQL** 14+ (servidor local activo)
- PowerShell 5.1 (Windows) o Bash (Linux/Mac)

---

## 🚀 Instalación Inicial (Primera vez)

### 1. Clonar el repositorio
```powershell
git clone https://github.com/JosuePalma1/chrispar_RH.git
cd chrispar_RH
```

### 2. Configurar Backend
```powershell
cd backend
pip install -r requirements.txt
```

### 3. Crear archivo `.env` en `backend/`
```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/chrispar
SECRET_KEY=super-secret-key-123
JWT_SECRET_KEY=jwt-secret-key-456
```

### 4. Crear base de datos en PostgreSQL
```sql
CREATE DATABASE chrispar;
```

### 5. Aplicar migraciones y crear usuario administrador
```powershell
python -m flask db upgrade
python inicializar_db.py
```

> Esto crea el usuario **admin** con contraseña **123**

### 6. (Opcional) Poblar datos de prueba
```powershell
python database_seeder.py
```

### 7. Configurar Frontend
```powershell
cd ..\frontend
npm install
```

---

---

## 🔄 Actualización del Proyecto (git pull)

Cuando el equipo suba cambios al repositorio, seguir estos pasos **EN ORDEN**:

### 1. Sincronizar código
```powershell
git pull origin main
```

### 2. Actualizar dependencias del backend (si cambiaron)
```powershell
cd backend
pip install -r requirements.txt
```

### 3. **IMPORTANTE:** Aplicar nuevas migraciones
```powershell
python -m flask db upgrade
```

> ⚠️ Este paso es **obligatorio** si hay nuevas migraciones. Ignorarlo causará errores de tablas/columnas faltantes.

### 4. Actualizar dependencias del frontend (si cambiaron)
```powershell
cd ..\frontend
npm install
```

### 5. Si el error persiste: regenerar usuario admin
```powershell
cd ..\backend
python inicializar_db.py
```

### Errores comunes después de `git pull`:

| Error | Causa | Solución |
| --- | --- | --- |
| `relation "tabla" does not exist` | Falta aplicar migraciones | `python -m flask db upgrade` |
| `column "columna" does not exist` | Base de datos desactualizada | `python -m flask db upgrade` |
| `No module named 'X'` | Dependencias no instaladas | `pip install -r requirements.txt` |
| `Cannot find module 'X'` (frontend) | Paquetes npm faltantes | `npm install` |
| Error de login | Usuario admin desactualizado | `python inicializar_db.py` |

---

## ▶️ Ejecución

### Backend
```powershell
cd backend
python app.py
```
Servidor disponible en: `http://127.0.0.1:5000`

### Frontend
```powershell
cd frontend
npm start
```
Aplicación disponible en: `http://localhost:3000`

### Credenciales de acceso
Se crean ejecutando `python scripts/database/init_admin.py`:
- Usuario: **admin**
- Contraseña: **123**

### Poblar datos de prueba
```powershell
python scripts/database/seed.py
```

---

## 🔐 Variables de Entorno

### Backend (`backend/.env`)
```env
# Base de datos
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:PASSWORD@postgres_mirror:5432/chrispar

# Seguridad
SECRET_KEY=clave-secreta-para-sesiones
JWT_SECRET_KEY=clave-secreta-para-jwt
FLASK_ENV=development
```

> 📖 **Ver guía completa**: [docs/configuration/environment-variables.md](docs/configuration/environment-variables.md)

### Frontend (`frontend/.env`) - Opcional
```env
REACT_APP_API_URL=http://127.0.0.1:5000
```

---

## 🔄 Alta Disponibilidad y Failover

El sistema incluye **failover automático on-demand** entre base de datos principal y mirror.

### 📊 Características

- ✅ **Failover On-Demand**: Se activa cuando se detecta fallo al usar la app
- ✅ **Failover Instantáneo**: Cambio en < 1 segundo
- ✅ **Failback Automático**: Vuelve al primary cuando se recupera
- ✅ **Scripts Manuales**: Para mantenimiento planificado
- ✅ **Replicación Lógica**: PostgreSQL logical replication
- ✅ **Sin Overhead**: No consume recursos en background

### 🚀 Uso Rápido

#### Verificar estado del sistema
```powershell
.\scripts\failover\check_status.ps1
```

#### Failover manual (mantenimiento)
```powershell
# Cambiar al mirror
.\scripts\failover\failover_to_mirror.ps1

# Volver al primary
.\scripts\failover\failback_to_primary.ps1
```

#### Monitorear health check
```powershell
# Ver estado actual
curl http://localhost:5000/api/health
```

### 📖 Documentación Completa

- **[Quickstart](docs/features/failover/quickstart.md)** - Inicio rápido
- **[Overview](docs/features/failover/overview.md)** - Guía técnica completa  
- **[Comparison](docs/features/failover/comparison.md)** - On-Demand vs Background
- **[Examples](docs/features/failover/examples.md)** - 8 casos prácticos

---

## 🧪 Pruebas Automatizadas

![Tests](https://img.shields.io/badge/tests-186%20passing-success)
![Coverage](https://img.shields.io/badge/coverage-88%25-brightgreen)
![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue)

### Backend - 186 tests, 88% cobertura

#### Ejecutar todos los tests
```powershell
cd backend
pytest tests/ -v
```

#### Con reporte de cobertura
```powershell
pytest tests/ --cov=routes --cov=utils --cov=models --cov-report=html
# Ver reporte en: backend/htmlcov/index.html
```

#### Tests por categoría
```powershell
# Tests de autenticación
pytest tests/test_auth*.py -v

# Tests de rutas específicas
pytest tests/test_empleado_routes.py -v

# Tests end-to-end
pytest tests/test_e2e_workflows.py -v
```

**Cobertura por módulo:**
- ✅ Autenticación y autorización: 90%
- ✅ Empleados: 84%
- ✅ Nóminas: 80%
- ✅ Cargos: 95%
- ✅ Manejo de errores: 100%

> 📖 **Ver guía completa**: [docs/testing/overview.md](docs/testing/overview.md)

### Frontend - 20 tests

```powershell
cd frontend
npm test
```

**Incluye:**
- Tests de componentes Dashboard y Sidebar
- Tests de utilidades (tokens, mocks)
- Tests de renderizado y permisos

### CI/CD con GitHub Actions
Cada push ejecuta automáticamente:
- ✅ Tests en Python 3.10, 3.11 y 3.12
- ✅ Linting con Flake8
- ✅ Verificación de formato con Black
- ✅ Análisis de seguridad

---

---

## 📡 API y Endpoints

Base URL: `http://127.0.0.1:5000/api`

### Principales endpoints:

| Módulo | Endpoint | Funcionalidad |
| --- | --- | --- |
| Autenticación | `/usuarios/login` | Login con JWT |
| Usuarios | `/usuarios/` | CRUD de usuarios del sistema |
| Cargos | `/cargos/` | Gestión de puestos y permisos |
| Empleados | `/empleados/` | Registro y gestión de empleados |
| Nóminas | `/nominas/` | Procesamiento de nóminas |
| Rubros | `/rubros/` | Devengos y deducciones |
| Horarios | `/horarios/` | Turnos laborales |
| Asistencias | `/asistencias/` | Control de entrada/salida |
| Permisos | `/permisos/` | Solicitudes de ausencias |
| Hojas de Vida | `/hojas-vida/` | CVs de empleados |
| Logs | `/logs/` | Auditoría de transacciones |

Todos los endpoints (excepto login) requieren header de autenticación:
```
Authorization: Bearer <token_jwt>
```

---

## ✨ Características Implementadas

**Autenticación y Seguridad:**
- ✅ Login con JWT y refresh tokens
- ✅ Control de acceso basado en roles
- ✅ Permisos granulares por cargo
- ✅ Sesiones persistentes en localStorage
- ✅ Manejo de errores sin exponer SQL

**Módulos de Negocio:**
- ✅ CRUD completo de 10 módulos
- ✅ Validaciones de integridad referencial
- ✅ Mensajes de error amigables
- ✅ Logs de auditoría automáticos

**Interfaz de Usuario:**
- ✅ Dashboard con métricas
- ✅ Sidebar dinámico según permisos
- ✅ Formularios con validación cliente/servidor
- ✅ Diseño responsivo

**Calidad y Testing:**
- ✅ 186 tests funcionales automatizados
- ✅ 88% cobertura de código
- ✅ CI/CD con GitHub Actions
- ✅ Migraciones versionadas

---

---

## 🆘 Solución de Problemas

### Problemas de Base de Datos

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `relation "tabla" does not exist` | Migraciones no aplicadas | `python -m flask db upgrade` |
| `column "nombre_columna" does not exist` | Base de datos desactualizada | `python -m flask db upgrade` |
| `Can't connect to PostgreSQL` | Servicio detenido o credenciales erróneas | Verificar servicio PostgreSQL y archivo `.env` |
| `Target database is not up to date` | Falta ejecutar migraciones | `python -m flask db upgrade` |

### Problemas de Dependencias

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `No module named 'flask'` | Dependencias no instaladas | `pip install -r requirements.txt` |
| `Cannot find module 'axios'` | Paquetes npm faltantes | `npm install` |
| `ModuleNotFoundError: No module named 'X'` | Paquete específico faltante | `pip install <paquete>` |

### Problemas de Autenticación

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Error al hacer login con admin/123 | Usuario no inicializado | `python inicializar_db.py` |
| Token expirado | Sesión vencida | Volver a iniciar sesión |
| `401 Unauthorized` | Token inválido o faltante | Verificar header Authorization |

### Problemas después de git pull

1. **Siempre ejecutar** `python -m flask db upgrade` después de pull
2. Si persisten errores: reinstalar dependencias con `pip install -r requirements.txt`
3. Si hay conflictos de migraciones: contactar al equipo antes de resolverlos

---

## 🔁 Workflows de Desarrollo

### Agregar nuevo módulo (backend)
1. Crear modelo en `backend/models/`
2. Crear blueprint en `backend/routes/`
3. Generar migración: `python -m flask db migrate -m "Descripción"`
4. Aplicar migración: `python -m flask db upgrade`
5. Agregar tests en `backend/tests/`

### Agregar nuevo componente (frontend)
1. Crear componente en `frontend/src/components/`
2. Agregar ruta en `App.js` usando `ProtectedRoute`
3. Implementar llamadas API con Axios
4. Agregar tests en `frontend/src/__tests__/`

### Antes de hacer commit
```powershell
# 1. Ejecutar tests
cd backend
pytest tests/ -v

# 2. Verificar que el código funciona
python app.py  # Probar endpoints

# 3. Commit descriptivo
git add .
git commit -m "tipo: Descripción breve de cambios"

# 4. Sincronizar
git pull origin main
git push origin main
```

**Tipos de commit recomendados:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Documentación
- `test:` Tests
- `refactor:` Refactorización

---

## 👥 Equipo

- Yimmi Leonel Barberan Moreira
- James Malony Molina Bravo
- Marcelo Matias Nieto Medina
- Josue Fernando Palma Zambrano
- Alex Sahid Triviño Hidalgo

**Curso:** Aplicaciones Web II - 6to Semestre  
**Proyecto:** Sistema de Gestión de Recursos Humanos para Chrispar Market

---

---