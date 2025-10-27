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

### 3️⃣ Instalar Frontend
```bash
cd frontend
npm install
```

---

## 🗄️ Configuración de Base de Datos

### Opción 1: PostgreSQL (Recomendado)

1. **Crear la base de datos en PostgreSQL:**
   ```sql
   CREATE DATABASE chrispar;
   ```

2. **Configurar archivo `.env` en `backend/.env`:**
   ```env
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/chrispar
   SECRET_KEY=tu_clave_secreta
   FLASK_APP=app.py
   ```

3. **Ejecutar migraciones:**
   ```bash
   cd backend
   python -m flask db upgrade
   ```

### Opción 2: SQLite (Para pruebas rápidas)

Si no quieres usar PostgreSQL, el sistema usa SQLite por defecto. Solo ejecuta:
```bash
cd backend
python -m flask db upgrade
```

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

---

## 📁 Estructura del Proyecto

```
chrispar_HHRR/
├── backend/
│   ├── models/               # Modelos de base de datos
│   │   ├── __init__.py
│   │   ├── cargo.py
│   │   ├── empleado.py
│   │   └── usuario.py
│   ├── routes/               # Rutas de la API
│   │   ├── __init__.py
│   │   ├── cargo_routes.py
│   │   ├── empleado_routes.py
│   │   └── usuario_routes.py
│   ├── migrations/           # Archivos de migración
│   ├── app.py               # Punto de entrada
│   ├── config.py            # Configuración
│   ├── extensions.py        # Extensiones de Flask
│   ├── requirements.txt     # Dependencias Python
│   └── .env                 # Variables de entorno (NO SUBIR A GIT)
│
└── frontend/
    ├── src/
    ├── public/
    └── package.json
```

---

## 🔌 Endpoints API Disponibles

### **Cargos** (`/api/cargos/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/cargos/` | Crear cargo |
| GET | `/api/cargos/` | Listar cargos |
| GET | `/api/cargos/<id>` | Obtener cargo |
| PUT | `/api/cargos/<id>` | Actualizar cargo |
| DELETE | `/api/cargos/<id>` | Eliminar cargo |

### **Usuarios** (`/api/usuarios/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/usuarios/` | Crear usuario |
| GET | `/api/usuarios/` | Listar usuarios |
| GET | `/api/usuarios/<id>` | Obtener usuario |
| PUT | `/api/usuarios/<id>` | Actualizar usuario |
| DELETE | `/api/usuarios/<id>` | Eliminar usuario |
| POST | `/api/usuarios/login` | Login |
| GET | `/api/usuarios/rol/<rol>` | Buscar por rol |

### **Empleados** (`/api/empleados/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/empleados/` | Crear empleado |
| GET | `/api/empleados/` | Listar empleados |
| GET | `/api/empleados/<id>` | Obtener empleado |
| PUT | `/api/empleados/<id>` | Actualizar empleado |
| DELETE | `/api/empleados/<id>` | Eliminar empleado |

---

## 📝 Cómo Crear Nuevos Modelos y Rutas

### Paso 1: Crear el Modelo

**Archivo:** `backend/models/tu_modelo.py`

```python
from extensions import db
from datetime import datetime

class TuModelo(db.Model):
    __tablename__ = "tu_tabla"
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    # ... más campos
    
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, onupdate=datetime.utcnow)
```

### Paso 2: Crear las Rutas

**Archivo:** `backend/routes/tu_modelo_routes.py`

```python
from flask import Blueprint, request, jsonify
from extensions import db
from models.tu_modelo import TuModelo

tu_modelo_bp = Blueprint('tu_modelo', __name__, url_prefix='/api/tu-modelo')

@tu_modelo_bp.route('/', methods=['POST'])
def crear():
    from extensions import db
    data = request.get_json()
    nuevo = TuModelo(nombre=data['nombre'])
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"mensaje": "Creado", "id": nuevo.id}), 201

@tu_modelo_bp.route('/', methods=['GET'])
def listar():
    items = TuModelo.query.all()
    return jsonify([{"id": i.id, "nombre": i.nombre} for i in items])
```

### Paso 3: Registrar el Modelo

En `backend/models/__init__.py`, descomenta o agrega:
```python
from .tu_modelo import TuModelo
```

### Paso 4: Registrar las Rutas

En `backend/routes/__init__.py`, agrega:
```python
from .tu_modelo_routes import tu_modelo_bp

all_blueprints = [
    # ... otros blueprints
    tu_modelo_bp,
]
```

### Paso 5: Crear y Aplicar Migración

```bash
cd backend
python -m flask db migrate -m "Agregar tabla tu_modelo"
python -m flask db upgrade
```

---

## 🧪 Pruebas con Postman

### Configuración Inicial
1. Abre Postman
2. Crea una nueva colección llamada "Chrispar API"
3. **Importante:** En cada petición que envíe datos (POST, PUT):
   - Ve a **Headers**
   - Agrega: `Content-Type: application/json`

### Ejemplo: Crear un Cargo

**POST** `http://127.0.0.1:5000/api/cargos/`

Headers:
```
Content-Type: application/json
```

Body (raw JSON):
```json
{
  "nombre": "Desarrollador Senior",
  "sueldo_base": 1500.00
}
```

Respuesta esperada:
```json
{
  "mensaje": "Cargo creado exitosamente",
  "id": 1
}
```

---

## 👥 Equipo

- **Yimmi Leonel Barberan Moreira**
- **James Malony Molina Bravo**
- **Marcelo Matias Nieto Medina**
- **Josue Fernando Palma Zambrano**
- **Alex Sahid Triviño Hidalgo**

---

## ⚠️ Notas Importantes

### ❌ NO subir a Git:
- `backend/.env` (contiene contraseñas)
- `backend/__pycache__/`
- `backend/venv/`
- `frontend/node_modules/`
- `backend/database.db` (si usas SQLite)

### ✅ Antes de hacer push:
```bash
git add .
git commit -m "Descripción de cambios"
git pull origin main
git push origin main
```

### 🐛 Problemas Comunes

**Error: "database does not exist"**
- Asegúrate de crear la base de datos en PostgreSQL

**Error: "The current Flask app is not registered"**
- Reinicia el servidor Flask completamente

**Error: "No module named 'flask'"**
- Instala las dependencias: `pip install -r requirements.txt`

**Error en Postman: "415 Unsupported Media Type"**
- Agrega el header `Content-Type: application/json`

---
