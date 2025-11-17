# 🏢 Sistema de Gestión de Recursos Humanos - Chrispar Market

Sistema web para la gestión de recursos humanos desarrollado para **Aplicaciones Web II**.

---

## 📋 Tabla de Contenido
- [Tecnologías](#-tecnologías)
- [Instalación Rápida](#-instalación-rápida)
- [Configuración de Base de Datos](#-configuración-de-base-de-datos)
- [Cómo Ejecutar el Proyecto](#-cómo-ejecutar-el-proyecto)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Endpoints API Disponibles](#-endpoints-api-disponibles)
- [Cómo Crear Nuevos Modelos y Rutas](#-cómo-crear-nuevos-modelos-y-rutas)
- [Pruebas con Postman](#-pruebas-con-postman)
- [Equipo](#-equipo)

---

## 🛠️ Tecnologías

### Backend
- **Python 3.12**
- **Flask 2.2.5** - Framework web
- **Flask-SQLAlchemy** - ORM para base de datos
- **Flask-Migrate** - Manejo de migraciones
- **PostgreSQL** - Base de datos
- **python-dotenv** - Variables de entorno

### Frontend
- **React** - Interfaz de usuario
- **Axios** - Peticiones HTTP

---

## ⚡ Instalación Rápida

### 1️⃣ Clonar el repositorio
```bash
git clone https://github.com/JosuePalma1/chrispar_RH.git
cd chrispar_HHRR
```

### 2️⃣ Instalar Backend
```bash
cd backend
pip install -r requirements.txt
```

**¿Qué instala este comando?**
El archivo `requirements.txt` contiene todas las dependencias de Python necesarias:
- **Flask 2.2.5** - Framework web
- **Flask-SQLAlchemy 3.0.3** - ORM para manejar la base de datos
- **Flask-Migrate 4.1.0** - Migraciones de base de datos
- **psycopg2-binary** - Conector para PostgreSQL
- **PyJWT 2.10.1** - Autenticación con tokens JWT
- **python-dotenv** - Para leer variables del archivo `.env`

### 3️⃣ Instalar Frontend
```bash
cd frontend
npm install
```

**¿Qué instala este comando?**
El archivo `package.json` contiene las dependencias de Node.js:
- **React** - Librería para crear la interfaz de usuario
- **axios** - Para hacer peticiones HTTP al backend
- **react-router-dom** - Para manejar las rutas (Login → Dashboard)

**Configuración del frontend:**
El archivo `frontend/.env` ya está configurado con:
```env
REACT_APP_API_URL=http://127.0.0.1:5000
```
Esto permite que el frontend sepa dónde está el backend.

---

## 🗄️ Configuración de Base de Datos

### PostgreSQL - Configuración

1. **Instalar PostgreSQL:** [Descargar aquí](https://www.postgresql.org/download/)

2. **Crear la base de datos:**
   ```sql
   CREATE DATABASE chrispar;
   ```

3. **Configurar credenciales en `backend/.env`:**
   
   **Credenciales por defecto:**
   - Usuario: `postgres`
   - Contraseña: `123`
   - Base de datos: `chrispar`
   
   **Si tu contraseña de PostgreSQL es diferente**, edita el archivo `backend/.env` y cambia:
   ```env
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/chrispar
   ```

4. **Ejecutar migraciones:**
   ```bash
   cd backend
   $env:FLASK_APP = 'app:create_app'
   python -m flask db migrate -m "Crear tablas iniciales"
   python -m flask db upgrade
   ```
   
   ⚠️ **Nota:** Cada integrante del equipo debe correr `flask db migrate` en su máquina local. Los archivos de migración NO se suben a Git para evitar conflictos.

---

## 🚀 Cómo Ejecutar el Proyecto

### Backend (Puerto 5000)
```bash
cd backend
python app.py
```

El servidor estará disponible en: `http://127.0.0.1:5000`

### Frontend (Puerto 3000)
```bash
cd frontend
npm start
```

La interfaz estará disponible en: `http://localhost:3000`

### 🔐 Estado Actual de la Aplicación

**✅ Implementado:**
- Login funcional con autenticación JWT
- Conexión frontend-backend con axios
- Navegación con React Router (Login → Dashboard)
- Sesión persistente con localStorage
- Estilos con colores corporativos (verde #9bcf15 y naranja #fa6e15)

**🚧 En desarrollo:**
- Dashboard principal (actualmente muestra "Hola" como placeholder)
- Módulos de gestión (empleados, cargos, nóminas, etc.)

---

## 📁 Estructura del Proyecto

```
chrispar_HHRR/
├── backend/
│   ├── models/               # Modelos de base de datos (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── cargo.py         # Modelo de cargos/puestos
│   │   ├── empleado.py      # Modelo de empleados
│   │   ├── usuario.py       # Modelo de usuarios (login)
│   │   ├── asistencia.py    # Modelo de asistencias
│   │   ├── horario.py       # Modelo de horarios
│   │   ├── hoja_vida.py     # Modelo de hojas de vida
│   │   ├── nomina.py        # Modelo de nóminas
│   │   ├── permiso.py       # Modelo de permisos
│   │   ├── rubro.py         # Modelo de rubros
│   │   └── log_transaccional.py  # Auditoría de operaciones
│   │
│   ├── routes/               # Rutas de la API REST
│   │   ├── __init__.py
│   │   ├── cargo_routes.py
│   │   ├── empleado_routes.py
│   │   ├── usuario_routes.py      # Incluye /login
│   │   ├── asistencia_routes.py
│   │   ├── horario_routes.py
│   │   ├── hoja_vida_routes.py
│   │   ├── nomina_routes.py
│   │   ├── permiso_routes.py
│   │   ├── rubro_routes.py
│   │   └── log_transaccional_routes.py
│   │
│   ├── utils/                # Utilidades y helpers
│   │   └── auth.py          # JWT - autenticación y decoradores
│   │
│   ├── migrations/           # Migraciones de base de datos (Alembic)
│   │   └── versions/        # Historial de cambios en BD
│   │
│   ├── app.py               # Punto de entrada - crea la app Flask
│   ├── config.py            # Configuración de la aplicación
│   ├── extensions.py        # Instancias de extensiones (db, migrate)
│   ├── requirements.txt     # Dependencias Python (Flask, SQLAlchemy, etc)
│   └── .env                 # Variables de entorno (credenciales BD)
│
└── frontend/
    ├── public/              # Archivos estáticos públicos
    │   ├── index.html       # HTML base de la aplicación
    │   ├── manifest.json    # Metadata de la app
    │   └── robots.txt
    │
    ├── src/                 # Código fuente de React
    │   ├── components/      # Componentes reutilizables
    │   │   ├── Login.js     # Pantalla de inicio de sesión
    │   │   ├── Login.css    # Estilos del login (verde/naranja)
    │   │   ├── Dashboard.js # Pantalla principal después del login
    │   │   └── Dashboard.css
    │   │
    │   ├── App.js           # Componente principal con rutas
    │   ├── App.css          # Estilos globales
    │   ├── index.js         # Punto de entrada de React
    │   ├── index.css        # Estilos base
    │   └── setupTests.js    # Configuración de pruebas
    │
    ├── .env                 # Variables de entorno (URL del backend)
    ├── package.json         # Dependencias Node (React, axios, router)
    └── README.md            # Documentación específica del frontend
```

---

## 🔌 Endpoints API Disponibles

### 📬 Postman Workspace Compartido

Todos los endpoints están documentados y listos para probar en **Postman**.

**👉 Revisa el link de invitación que te llegó al correo para acceder al workspace compartido.**

El workspace incluye:
- ✅ Todos los endpoints configurados (Cargos, Usuarios, Empleados, etc.)
- ✅ Headers preconfigurados
- ✅ Ejemplos de peticiones y respuestas
- ✅ Variables de entorno para cambiar entre desarrollo/producción

### Módulos principales disponibles:
- `/api/cargos/` - Gestión de cargos
- `/api/usuarios/` - Gestión de usuarios y login
- `/api/empleados/` - Gestión de empleados
- `/api/asistencias/` - Registro de asistencias
- `/api/horarios/` - Gestión de horarios
- `/api/nominas/` - Gestión de nóminas
- `/api/permisos/` - Gestión de permisos
- `/api/logs/` - Auditoría de operaciones

---

## 📝 Pasos para Desarrollar Nuevas Funcionalidades

### Backend - Crear Nuevos Modelos y Rutas

**Paso 1:** Crear archivo de modelo en `backend/models/tu_modelo.py`
- Define la clase con SQLAlchemy
- Especifica las columnas y tipos de datos

**Paso 2:** Crear archivo de rutas en `backend/routes/tu_modelo_routes.py`
- Crea el Blueprint
- Define los endpoints (GET, POST, PUT, DELETE)

**Paso 3:** Registrar el modelo en `backend/models/__init__.py`
- Importa tu nuevo modelo

**Paso 4:** Registrar las rutas en `backend/routes/__init__.py`
- Importa tu Blueprint
- Agrégalo a `all_blueprints`

**Paso 5:** Crear y aplicar migración localmente
```bash
cd backend
$env:FLASK_APP = 'app:create_app'
python -m flask db migrate -m "Descripción del cambio"
python -m flask db upgrade
```

⚠️ **Importante:** Solo crea migraciones en TU máquina. Se sube a GIT

### Frontend - Crear Nuevos Componentes

**Paso 1:** Crear componente en `frontend/src/components/TuComponente.js`
- Usa React hooks (useState, useEffect)
- Usa axios para conectar con el backend

**Paso 2:** Crear estilos en `frontend/src/components/TuComponente.css`
- Usa los colores corporativos: verde #9bcf15 y naranja #fa6e15

**Paso 3:** Agregar ruta en `frontend/src/App.js`
- Importa tu componente
- Agrega `<Route>` en el Router

**Paso actual:** Dashboard básico implementado, listo para agregar módulos de gestión

---

## 🧪 Pruebas con Postman

### Pasos para probar los endpoints:

1. **Abrir Postman** y crear una colección "Chrispar API"

2. **Configurar Headers** en cada petición POST/PUT:
   - Key: `Content-Type`
   - Value: `application/json`

3. **Seleccionar el método HTTP** (GET, POST, PUT, DELETE)

4. **Ingresar la URL** del endpoint:
   - Ejemplo: `http://127.0.0.1:5000/api/cargos/`

5. **Agregar el Body** (en formato JSON) para POST/PUT

6. **Click en Send** y revisar la respuesta

💡 **Tip:** Revisa la sección "Endpoints API Disponibles" para ver todas las rutas disponibles

---

## 👥 Equipo

- **Yimmi Leonel Barberan Moreira**
- **James Malony Molina Bravo**
- **Marcelo Matias Nieto Medina**
- **Josue Fernando Palma Zambrano**
- **Alex Sahid Triviño Hidalgo**

---

## ⚠️ Notas Importantes

### 👁️ Archivos protegidos (`.gitignore`)
Estos archivos **NO se suben a Git** automáticamente:
- `backend/__pycache__/` - Archivos compilados de Python
- `backend/venv/` o `env/` - Entorno virtual
- `frontend/node_modules/` - Dependencias de Node.js
- `backend/migrations/versions/` - **Archivos de migración (cada quien genera los suyos)**

**Nota:** Los archivos `.env` **SÍ están incluidos** en el repositorio para facilitar la configuración del equipo.

### ✅ Antes de hacer push:
```bash
git add .
git commit -m "Descripción de cambios"
git pull origin main
git push origin main
```

### 🐛 Problemas Comunes (Top 3)

**1. Error: "Can't connect to PostgreSQL"**
   - Verifica que PostgreSQL esté corriendo
   - Revisa tu contraseña en `backend/.env`
   - Asegúrate de que la base de datos `chrispar` existe

**2. Error: "No module named 'flask'"**
   - Instala las dependencias: `pip install -r requirements.txt`

**3. Error en migraciones: "Target database is not up to date"**
   - Ejecuta: `python -m flask db upgrade`

---
