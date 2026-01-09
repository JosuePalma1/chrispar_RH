# 🤝 Guía de Contribución

Gracias por tu interés en contribuir a **Chrispar HR**. Esta guía te ayudará a mantener la calidad y consistencia del código.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Testing](#testing)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta profesional:
- Sé respetuoso con otros colaboradores
- Acepta críticas constructivas
- Enfócate en lo mejor para el proyecto
- Mantén un ambiente inclusivo y colaborativo

---

## 🚀 Cómo Contribuir

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub
# Luego clona tu fork
git clone https://github.com/tu-usuario/chrispar_RH.git
cd chrispar_RH
```

### 2. Crear una Rama

```bash
git checkout -b feature/nueva-funcionalidad
# o
git checkout -b fix/corregir-bug
```

### 3. Hacer Cambios

Desarrolla tu funcionalidad o corrección siguiendo los estándares de código.

### 4. Commit

```bash
git add .
git commit -m "tipo: descripción breve"
```

**Tipos de commit:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma faltante, etc.
- `refactor:` Refactorización de código
- `test:` Agregar o actualizar tests
- `chore:` Mantenimiento, dependencias

**Ejemplo:**
```bash
git commit -m "feat: agregar endpoint de reportes mensuales"
git commit -m "fix: corregir validación de fecha en asistencias"
```

### 5. Push y Pull Request

```bash
git push origin feature/nueva-funcionalidad
```

Luego crea un Pull Request en GitHub con:
- Descripción clara de los cambios
- Referencia a issues relacionados
- Screenshots si aplica

---

## 📝 Estándares de Código

### Backend (Python/Flask)

**Estilo:**
- Seguir PEP 8
- Usar `snake_case` para funciones y variables
- Usar `PascalCase` para clases
- Documentar funciones complejas con docstrings

**Ejemplo:**
```python
def calcular_nomina_empleado(empleado_id: int, periodo: str) -> dict:
    """
    Calcula la nómina de un empleado para un período específico.
    
    Args:
        empleado_id: ID del empleado
        periodo: Período en formato YYYY-MM
    
    Returns:
        dict: Detalles de la nómina calculada
    """
    # Implementación...
    pass
```

**Base de datos:**
- Usar migraciones de Alembic para cambios de esquema
- Nunca modificar BD directamente en producción
- Agregar índices para queries frecuentes

**Testing:**
- Escribir tests para nuevas funcionalidades
- Mantener cobertura >80%
- Tests deben ser independientes

### Frontend (React)

**Estilo:**
- Componentes funcionales con Hooks
- Usar `camelCase` para funciones y variables
- Usar `PascalCase` para componentes
- PropTypes o TypeScript para validación

**Ejemplo:**
```javascript
import React, { useState, useEffect } from 'react';

function EmpleadoCard({ empleado, onEdit }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Implementación...
  
  return (
    <div className="empleado-card">
      {/* JSX */}
    </div>
  );
}

export default EmpleadoCard;
```

**API Calls:**
- Usar Axios centralizado
- Manejar errores apropiadamente
- Mostrar loading states

---

## 🔄 Proceso de Pull Request

### Antes de Enviar

1. **Ejecutar tests:**
   ```bash
   # Backend
   cd backend
   pytest tests/
   
   # Frontend
   cd frontend
   npm test
   ```

2. **Verificar estilo de código:**
   ```bash
   # Backend
   flake8 .
   
   # Frontend
   npm run lint
   ```

3. **Actualizar documentación:**
   - README si cambias funcionalidades principales
   - Comentarios en código complejo
   - Guías en `/docs` si es necesario

### Checklist del PR

- [ ] Tests pasan correctamente
- [ ] Código sigue estándares del proyecto
- [ ] Documentación actualizada
- [ ] Sin conflictos con `main`
- [ ] Commits tienen mensajes descriptivos
- [ ] Screenshots/GIFs si hay cambios visuales

### Revisión

- Los maintainers revisarán tu PR
- Pueden solicitar cambios
- Una vez aprobado, será merged a `main`

---

## 📂 Estructura del Proyecto

```
chrispar_HHRR/
├── backend/           # API Flask
│   ├── models/       # Modelos SQLAlchemy
│   ├── routes/       # Blueprints/Endpoints
│   ├── tests/        # Tests con Pytest
│   └── utils/        # Helpers
│
├── frontend/         # SPA React
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   └── __tests__/   # Tests con Jest
│   └── public/
│
├── docs/             # Documentación
├── scripts/          # Scripts utilitarios
└── docker/           # Configuración Docker
```

### Agregar Nuevo Módulo (Backend)

1. Crear modelo en `backend/models/nuevo_modelo.py`
2. Crear blueprint en `backend/routes/nuevo_routes.py`
3. Registrar blueprint en `backend/routes/__init__.py`
4. Crear migración: `flask db migrate -m "agregar tabla nuevo"`
5. Aplicar migración: `flask db upgrade`
6. Agregar tests en `backend/tests/test_nuevo_routes.py`

### Agregar Nuevo Componente (Frontend)

1. Crear componente en `frontend/src/components/Nuevo.js`
2. Crear CSS en `frontend/src/components/Nuevo.css`
3. Agregar ruta en `App.js`
4. Agregar tests en `frontend/src/__tests__/components/Nuevo.test.js`

---

## 🧪 Testing

### Backend

```bash
cd backend

# Todos los tests
pytest tests/

# Con cobertura
pytest tests/ --cov=. --cov-report=html

# Tests específicos
pytest tests/test_empleado_routes.py

# Ver cobertura
open htmlcov/index.html  # macOS/Linux
start htmlcov/index.html # Windows
```

### Frontend

```bash
cd frontend

# Todos los tests
npm test

# Con cobertura
npm test -- --coverage

# Tests específicos
npm test -- Empleado.test.js
```

---

## 🐛 Reportar Bugs

Usa el [issue tracker de GitHub](https://github.com/JosuePalma1/chrispar_RH/issues) con:

**Título:** Descripción breve del problema

**Contenido:**
- **Descripción:** ¿Qué sucedió?
- **Pasos para reproducir:** Paso a paso
- **Comportamiento esperado:** ¿Qué debería pasar?
- **Comportamiento actual:** ¿Qué pasa realmente?
- **Screenshots:** Si aplica
- **Entorno:** 
  - OS: Windows/Mac/Linux
  - Navegador: Chrome/Firefox/Safari
  - Versión de Python/Node

---

## ✨ Sugerir Mejoras

Para nuevas funcionalidades:

1. Verifica que no exista un issue similar
2. Crea un nuevo issue con etiqueta `enhancement`
3. Describe la funcionalidad y su beneficio
4. Proporciona ejemplos de uso si es posible

---

## 📞 Contacto

- **Issues:** [GitHub Issues](https://github.com/JosuePalma1/chrispar_RH/issues)
- **Email:** [Información en el perfil de GitHub]

---

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones se licenciarán bajo la misma licencia del proyecto.

---

**¡Gracias por contribuir a Chrispar HR! 🎉**
