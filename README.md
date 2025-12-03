# 🏢 Sistema de Gestión de RRHH - Chrispar Market

Sistema web completo para gestionar Recursos Humanos de Chrispar Market. Desarrollado con Flask (backend) + React (frontend).

---

## 📋 ¿Qué hace este sistema?

Permite administrar:
- ✅ Empleados, cargos y usuarios
- ✅ Nóminas y rubros salariales  
- ✅ Horarios y asistencias
- ✅ Permisos y hojas de vida
- ✅ Control de acceso por roles
- ✅ Logs de auditoría

---

## 🛠️ Tecnologías

**Backend:** Python 3.12 + Flask + PostgreSQL  
**Frontend:** React 19 + React Router + Axios  
**Tests:** 186 tests automatizados (88% cobertura)

---

## 📁 Estructura del proyecto

```
chrispar_HHRR/
├── backend/              # API REST con Flask
│   ├── models/          # Tablas de la base de datos
│   ├── routes/          # Endpoints (empleados, nóminas, etc.)
│   ├── tests/           # 186 tests automatizados
│   ├── migrations/      # Migraciones de base de datos
│   └── app.py           # Punto de entrada
│
└── frontend/            # Interfaz con React
    └── src/
        ├── components/  # Páginas y formularios
        └── App.js       # Rutas protegidas
```

---

## 📦 Requisitos

- Python 3.12
- Node.js 18+
- PostgreSQL 14+

---

## 🚀 Instalación (Primera vez)

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

### 3. Crear archivo `.env` en la carpeta `backend/`
```env
DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar
SECRET_KEY=tu-clave-secreta
JWT_SECRET_KEY=tu-jwt-secret
```

### 4. Crear la base de datos
En PostgreSQL, ejecuta:
```sql
CREATE DATABASE chrispar;
```

### 5. Aplicar migraciones
```powershell
python -m flask db upgrade
python database_seeder.py
```

### 6. Configurar Frontend
```powershell
cd ..\frontend
npm install
```

**¡Listo!** Ya puedes ejecutar el proyecto.

---

## ▶️ Ejecutar el proyecto

### Backend (Terminal 1)
```powershell
cd backend
python app.py
```
Abre en: http://127.0.0.1:5000

### Frontend (Terminal 2)
```powershell
cd frontend
npm start
```
Abre en: http://localhost:3000

**Usuario por defecto:**
- Usuario: `admin`
- Contraseña: `123`

---

## 🔄 Actualizar el proyecto (Pull)

Si tus compañeros suben cambios:
```powershell
git pull

# Si hay nuevas migraciones:
cd backend
python -m flask db upgrade

# Si hay nuevas dependencias:
pip install -r requirements.txt
cd ..\frontend
npm install
```

---

## 🧪 Tests

### Backend: 186 tests (88% cobertura)
```powershell
cd backend
pytest tests/ -v
```

**Cobertura por módulo:**
- ✅ Autenticación y permisos
- ✅ CRUD de todos los módulos
- ✅ Validaciones y manejo de errores
- ✅ Workflows end-to-end

### Frontend: 20 tests
```powershell
cd frontend
npm test
```

### CI/CD Automático
Cada commit ejecuta automáticamente:
- ✅ 186 tests backend (Python 3.10, 3.11, 3.12)
- ✅ Linting y formato de código
- ✅ Tests de seguridad

---

## 📡 Endpoints principales

Base: `http://127.0.0.1:5000/api`

- `/usuarios/login` - Autenticación
- `/empleados/` - Gestión de empleados
- `/cargos/` - Puestos de trabajo
- `/nominas/` - Nóminas y rubros
- `/horarios/` - Horarios laborales
- `/asistencias/` - Control de asistencias
- `/permisos/` - Solicitudes de permisos
- `/hojas-vida/` - CVs de empleados
- `/logs/` - Auditoría de cambios

---

## ✨ Funcionalidades completadas

- ✅ Sistema de login con JWT
- ✅ Control de acceso por roles
- ✅ CRUD completo de 10 módulos
- ✅ Manejo de errores mejorado (no expone SQL)
- ✅ 186 tests automatizados
- ✅ Migraciones de base de datos
- ✅ Logs de auditoría
- ✅ Dashboard con métricas
- ✅ Sidebar dinámico por permisos

---

## 🔧 Problemas comunes

**"No puedo conectar a PostgreSQL"**
→ Verifica que PostgreSQL esté corriendo y las credenciales en `.env` sean correctas

**"No module named 'flask'"**
→ Instala dependencias: `pip install -r requirements.txt`

**"Target database is not up to date"**
→ Aplica migraciones: `python -m flask db upgrade`

**"Cannot find module 'axios'"**
→ Instala dependencias: `npm install`

---

## 👥 Equipo

- Yimmi Leonel Barberan Moreira
- James Malony Molina Bravo
- Marcelo Matias Nieto Medina
- Josue Fernando Palma Zambrano
- Alex Sahid Triviño Hidalgo

---

## 📝 Antes de hacer commit

```powershell
# 1. Ejecutar tests
cd backend
pytest tests/

# 2. Agregar cambios
git add .
git commit -m "Descripción clara de los cambios"

# 3. Sincronizar con el equipo
git pull
git push
```

---

**Universidad:** 6to Semestre - Aplicaciones Web II  
**Proyecto:** Sistema de Gestión de Recursos Humanos

---
