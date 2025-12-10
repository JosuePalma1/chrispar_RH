# 📚 Documentación del Sistema Chrispar HR

Bienvenido a la documentación técnica y arquitectónica del Sistema de Gestión de Recursos Humanos de Chrispar Market.

## 📂 Contenido

### 📊 [Diagramas de Arquitectura](./diagrams/)
Diagramas del sistema utilizando el modelo C4:
- **[C4 Nivel 1: Contexto del Sistema](./diagrams/c4-nivel1-contexto.puml)** - Vista general del sistema, actores externos y relaciones principales
- **[C4 Nivel 1: Contexto Detallado](./diagrams/c4-nivel1-contexto-detallado.puml)** - Versión extendida con más información técnica

## 🎯 Propósito de esta Documentación

Esta documentación tiene como objetivo:
1. **Visualizar la arquitectura** del sistema en diferentes niveles de abstracción
2. **Facilitar la comprensión** del sistema para nuevos desarrolladores
3. **Documentar decisiones** arquitectónicas y técnicas
4. **Servir como referencia** para el mantenimiento y evolución del sistema

## 📖 Modelo C4

Los diagramas utilizan el **Modelo C4** (Context, Containers, Components, Code), que es un enfoque de documentación arquitectónica que describe un sistema de software en diferentes niveles de zoom:

### Nivel 1: Contexto del Sistema
**Audiencia:** Todos (técnicos y no técnicos)  
**Muestra:** El sistema y cómo se relaciona con usuarios y otros sistemas

✅ **Ya disponible** en este repositorio

### Nivel 2: Contenedores
**Audiencia:** Desarrolladores y arquitectos  
**Muestra:** Aplicaciones, almacenes de datos y cómo se comunican

🔜 Próximamente

### Nivel 3: Componentes
**Audiencia:** Desarrolladores  
**Muestra:** Componentes dentro de cada contenedor

🔜 Próximamente

### Nivel 4: Código
**Audiencia:** Desarrolladores  
**Muestra:** Implementación a nivel de código (clases, interfaces)

🔜 Opcional

## 🏗️ Arquitectura del Sistema

### Vista General (Nivel 1)

El **Sistema Chrispar HR** es una aplicación web full-stack que centraliza todos los procesos de Recursos Humanos de Chrispar Market.

#### Componentes Principales:
- **Frontend**: React 19 (SPA - Single Page Application)
- **Backend**: Flask 2.2.5 (Python 3.12) - REST API
- **Base de Datos**: PostgreSQL 14+
- **Autenticación**: JWT (JSON Web Tokens)
- **Notificaciones**: Sistema de Email (SMTP)

#### Actores del Sistema:
1. **Administrador de RH** - Acceso completo al sistema
2. **Gerente/Supervisor** - Gestión de su equipo
3. **Empleado** - Consulta de información personal

#### Módulos Funcionales:
- 👥 Gestión de Empleados
- 🔐 Gestión de Usuarios y Autenticación
- 💼 Cargos y Permisos por Rol
- 💰 Procesamiento de Nóminas
- 📊 Rubros Salariales (Devengos y Deducciones)
- 🕐 Horarios de Trabajo
- ✅ Control de Asistencias
- 📝 Solicitudes de Permisos
- 📋 Hojas de Vida
- 📜 Logs de Auditoría

## 🛠️ Tecnologías y Herramientas

### Stack Tecnológico
```
Frontend:  React 19 + React Router 6 + Axios
Backend:   Python 3.12 + Flask 2.2.5 + SQLAlchemy
Database:  PostgreSQL 14+ con Alembic (migraciones)
Testing:   Pytest (186 tests) + React Testing Library (20 tests)
CI/CD:     GitHub Actions
```

### Herramientas de Desarrollo
- **Control de Versiones**: Git + GitHub
- **Gestión de Dependencias**: pip (Python) + npm (JavaScript)
- **Testing**: pytest + coverage.py + Jest
- **Diagramación**: PlantUML + C4-PlantUML

## 🔗 Enlaces Útiles

- [README Principal](../README.md) - Guía de instalación y uso
- [Configuración de Entorno](../CONFIGURACION_ENV.md) - Variables de entorno
- [Guía de Testing](../backend/TESTING_GUIDE.md) - Cómo ejecutar pruebas
- [Resumen de Tests](../backend/TESTING_SUMMARY.md) - Cobertura de pruebas

## 👥 Equipo de Desarrollo

- Yimmi Leonel Barberan Moreira
- James Malony Molina Bravo
- Marcelo Matias Nieto Medina
- Josue Fernando Palma Zambrano
- Alex Sahid Triviño Hidalgo

**Institución:** Universidad Técnica de Manabí  
**Curso:** Aplicaciones Web II - 6to Semestre  
**Proyecto:** Sistema de Gestión de Recursos Humanos para Chrispar Market

## 📅 Historial de Actualizaciones

| Fecha | Versión | Descripción |
|-------|---------|-------------|
| Dic 2025 | 1.0 | Diagramas C4 Nivel 1 - Contexto del Sistema |

---

**Nota:** Esta documentación se actualiza continuamente conforme evoluciona el sistema. Para contribuir o reportar errores en la documentación, por favor contacta al equipo de desarrollo.
