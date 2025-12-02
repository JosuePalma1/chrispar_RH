# 🏢 Chrispar HR · Sistema de Gestión de Recursos Humanos

Aplicación web full-stack (Flask + React) utilizada en **Aplicaciones Web II** para centralizar los procesos de RR. HH. de Chrispar Market.

---

## 📚 Tabla de Contenidos
- [Resumen del Proyecto](#-resumen-del-proyecto)
- [Arquitectura y Stack](#-arquitectura-y-stack)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Requisitos Previos](#-requisitos-previos)
- [Configuración Rápida](#-configuración-rápida)
- [Backend](#-backend)
- [Base de Datos y Migraciones](#-base-de-datos-y-migraciones)
- [Frontend](#-frontend)
- [Variables de Entorno](#-variables-de-entorno)
- [Pruebas Automatizadas](#-pruebas-automatizadas)
- [Workflows de Desarrollo](#-workflows-de-desarrollo)
- [API y Documentación](#-api-y-documentación)
- [Características y Roadmap](#-características-y-roadmap)
- [Solución de Problemas](#-solución-de-problemas)
- [Equipo y Buenas Prácticas](#-equipo-y-buenas-prácticas)

---

## 🧭 Resumen del Proyecto
- Plataforma interna para administrar cargos, usuarios, nóminas, horarios y más.
- Autenticación JWT, permisos por cargo y sesiones persistentes.
- Backend REST + frontend SPA conectados mediante Axios.
- Incluye scripts para poblar datos iniciales y pruebas automatizadas básicas.

---

## 🏗️ Arquitectura y Stack

| Capa | Tecnología principal | Detalles |
| --- | --- | --- |
| Backend | Python 3.12, Flask 2.2.5 | Blueprints, SQLAlchemy, JWT, CORS |
| Persistencia | PostgreSQL | Migraciones con Alembic/Flask-Migrate |
| Frontend | React + Vite? (it's CRA) but actual is CRA. Need accurate: React (Create React App). Provide correct info: 'Create React App (React 18), React Router DOM 6, Axios' |
| Infra | Variables `.env`, scripts PowerShell/Bash | README referencing instructions |
| Testing | Pytest, React Testing Library | Smoke tests para auth y dashboard |

---

## 🗂️ Estructura del Repositorio

```
chrispar_HHRR/
├── backend/
│   ├── app.py               # Punto de entrada Flask
│   ├── config.py            # Config global (dev/test/prod)
│   ├── extensions.py        # db, migrate, JWT, CORS
│   ├── models/              # Modelos SQLAlchemy (empleados, cargos, etc.)
│   ├── routes/              # Blueprints (login, dashboard, módulos CRUD)
│   ├── seeders/             # Scripts para datos base
│   ├── utils/               # Helpers (auth, parsers)
│   ├── migrations/          # Alembic
│   ├── tests/               # Pytest (auth)
│   └── requirements.txt
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/      # Login, Dashboard, CRUDs y Sidebar
    │   ├── App.js           # Rutas + ProtectedRoute
    │   ├── App.test.js      # Smoke test del dashboard
    │   └── setupTests.js
    └── package.json
```

---

## ✅ Requisitos Previos
- **Git** 2.x
- **Python** 3.12 (recomendado usar `venv`)
- **Node.js** 18 LTS + **npm** 9+
- **PostgreSQL** 14+ (servidor local)
- PowerShell 5.1 (Windows) o Bash (Linux/Mac)

---

## ⚡ Configuración Rápida
```powershell
git clone https://github.com/JosuePalma1/chrispar_RH.git
cd chrispar_RH

# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

> Tip: guarda la carpeta `chrispar_HHRR\.venv` fuera del repo si no quieres compartirla.

---

## 🐍 Backend

### Instalación y ejecución
```powershell
cd backend
.\.venv\Scripts\activate
python app.py          # Ejecuta en modo desarrollo en http://127.0.0.1:5000
```

### Dependencias clave
- Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended
- psycopg2-binary para PostgreSQL
- python-dotenv (lee `backend/.env`)

### Scripts útiles
- `python inicializar_db.py` → crea cargo administrador + usuario `admin/123`.
- `python database_seeder.py` → invoca seeders individuales (empleados, cargos, etc.).
- `python -m flask db <command>` → migraciones (ver sección siguiente).

---

## 🗄️ Base de Datos y Migraciones
1. Instala PostgreSQL y crea la base:
   ```sql
   CREATE DATABASE chrispar;
   ```
2. Configura `backend/.env` (ejemplo por defecto):
   ```env
   DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar
   SECRET_KEY=super-secret-key
   JWT_SECRET_KEY=jwt-secret-key
   ```
3. Inicializa las tablas (solo una vez):
   ```powershell
   cd backend
   $env:FLASK_APP = 'app:create_app'
   python -m flask db upgrade
   python inicializar_db.py
   ```
4. Si necesitas una BD vacía temporal para pruebas rápidas, puedes ejecutar `inicializar_db.py` sobre SQLite cambiando `DATABASE_URL` a `sqlite:///chrispar.db`.

> Las migraciones bajo `backend/migrations/versions/` ya incluyen la estructura completa. Si cambias los modelos, crea tu propia migración local y sincroniza con el equipo antes de subir archivos nuevos.

---

## ⚛️ Frontend

### Instalación y ejecución
```powershell
cd frontend
npm install
npm start              # http://localhost:3000
npm run build          # Genera artefactos para producción
```

### Dependencias clave
- React 18 (Create React App)
- React Router DOM 6.28
- Axios para llamadas al backend
- React Testing Library + Jest para pruebas

### Organización
- `components/` contiene cada módulo de negocio (Cargos, Usuarios, etc.).
- `ProtectedRoute.js` evita el acceso si no existe token válido en `localStorage`.
- Los estilos siguen la paleta corporativa (#9bcf15, #fa6e15).

---

## 🔐 Variables de Entorno

| Ubicación | Variable | Descripción |
| --- | --- | --- |
| `backend/.env` | `DATABASE_URL` | Cadena de conexión PostgreSQL/SQLite |
|  | `SECRET_KEY`, `JWT_SECRET_KEY` | Firmado de sesiones y tokens |
|  | `FLASK_ENV` | `development` o `production` |
| `frontend/.env` | `REACT_APP_API_URL` | URL base para Axios (`http://127.0.0.1:5000`) |

> Consulta `CONFIGURACION_ENV.md` si necesitas regenerar estos archivos.

---

## 🧪 Pruebas Automatizadas

![Tests](https://img.shields.io/badge/tests-58%20passing-success)
![Coverage](https://img.shields.io/badge/coverage-63%25-yellow)
![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue)

### Backend (pytest) - ✅ 58 tests, 63% cobertura

#### Ejecutar suite completa
```powershell
cd backend
python -m pytest tests/ -v
```

#### Con reporte de cobertura
```powershell
pytest tests/ --cov=routes --cov=utils --cov=models --cov-report=html
# Abre: backend/htmlcov/index.html
```

#### Tests por categoría
```powershell
# Solo tests unitarios
pytest tests/test_parsers.py tests/test_auth_utils.py -v

# Solo tests de integración
pytest tests/test_*_routes.py -v

# Solo tests E2E
pytest tests/test_e2e_workflows.py -v
```

**Cobertura por módulo:**
- ✅ Modelos: 91% promedio (Cargo, Empleado, Usuario: 100%)
- ✅ Utilidades: 87% (Parsers: 100%, Auth: 75%)
- ⚠️ Rutas: 58% promedio (Empleados: 84%, Nóminas: 80%, Asistencias: 75%)

Ver [TESTING_REPORT.md](backend/TESTING_REPORT.md) para detalles completos.

### Frontend (React Testing Library)
```powershell
cd frontend
npm test -- --watchAll=false
```
- Smoke test que monta el Dashboard con rutas protegidas simuladas.
- Amplía los tests agregando archivos `*.test.js` junto a cada componente.

### CI/CD
Los tests se ejecutan automáticamente en cada push/PR mediante GitHub Actions:
- ✅ Tests unitarios e integración
- ✅ Linting con Flake8
- ✅ Escaneo de seguridad con Bandit
- ✅ Reporte de cobertura

---

## 🔁 Workflows de Desarrollo

### Backend: nuevo módulo
1. Crea el modelo en `backend/models/tu_modelo.py` y expórtalo en `models/__init__.py`.
2. Genera rutas en `backend/routes/tu_modelo_routes.py`, agrégalas en `routes/__init__.py`.
3. Ejecuta migración: `python -m flask db migrate -m "tu mensaje"` + `python -m flask db upgrade`.
4. Agrega seeds si aplican dentro de `backend/seeders/`.

### Frontend: nuevo componente
1. Crea el componente y su CSS en `frontend/src/components/`.
2. Expone la ruta en `App.js` usando `ProtectedRoute`.
3. Si requiere datos, encapsula las llamadas Axios en un `useEffect` y maneja estados de carga/errores.

### Git + Pull Requests
- Antes de subir cambios: `pytest` + `npm test`.
- Usa commits descriptivos y ejecuta `git pull origin main` antes de hacer push.

---

## 📡 API y Documentación
- Base URL: `http://127.0.0.1:5000/api`.
- Endpoints principales:
  - `/usuarios/` (registro, listado, login)`
  - `/cargos/` (CRUD y permisos)
  - `/empleados/`, `/horarios/`, `/nominas/`, `/rubros/`, `/hojas-vida/`
  - `/asistencias/`, `/permisos/`, `/logs/`
- Existe un workspace compartido en Postman con headers y ejemplos listos (solicitar acceso al equipo si aún no lo tienes).

---

## 🚦 Características y Roadmap

| Estado | Funcionalidad |
| --- | --- |
| ✅ | Login JWT, persistencia de sesión, permisos basados en cargo |
| ✅ | CRUD de Cargos, Usuarios, Empleados, Horarios, Hojas de Vida, Nóminas y Rubros |
| ✅ | Sidebar dinámico según permisos, dashboard con métricas básicas |
| 🚧 | Módulo de Asistencias y Permisos/Vacaciones |
| 🚧 | Auditoría detallada y filtros por usuario |

---

## 🆘 Solución de Problemas

| Problema | Causas probables | Solución |
| --- | --- | --- |
| `Can't connect to PostgreSQL` | Servicio detenido, credenciales erróneas | Verifica que PostgreSQL esté en ejecución, prueba conexión con `psql`, actualiza `DATABASE_URL`. |
| `No module named 'flask'` | Entorno virtual no activado | Activa `.venv` y vuelve a correr `pip install -r requirements.txt`. |
| `Target database is not up to date` | Migraciones pendientes | `python -m flask db upgrade` desde `backend/`. |
| React Router warnings en pruebas | Flags de futuras APIs | Son normales con la versión actual; asegúrate de usar `react-router-dom@6.28.0`. |

---

## 👥 Equipo y Buenas Prácticas
- **Yimmi Leonel Barberan Moreira**
- **James Malony Molina Bravo**
- **Marcelo Matias Nieto Medina**
- **Josue Fernando Palma Zambrano**
- **Alex Sahid Triviño Hidalgo**

### Checklist antes de hacer push
```powershell
git status
git add .
git commit -m "Describe brevemente tus cambios"
git pull origin main
git push origin main
```

> Mantén tus cambios enfocados, incluye pruebas cuando corresponda y describe cualquier decisión técnica relevante en el PR para que el resto del equipo pueda continuar fácilmente.

---
