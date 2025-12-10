# 📊 Diagramas de Arquitectura - Sistema Chrispar HR

Este directorio contiene los diagramas de arquitectura del Sistema de Gestión de Recursos Humanos Chrispar, utilizando la notación **C4 Model**.

## 📁 Contenido

### C4 Nivel 1: Diagrama de Contexto del Sistema
**Archivo:** `c4-nivel1-contexto.puml`

Este diagrama muestra el panorama general del sistema, incluyendo:

#### 🎭 Actores Externos (Personas)
1. **Administrador de RH**
   - Gestiona todo el sistema de recursos humanos
   - Administra usuarios, empleados, cargos y configuraciones
   - Procesa nóminas y gestiona rubros salariales
   - Configura horarios y revisa asistencias

2. **Gerente/Supervisor**
   - Revisa información de empleados bajo su cargo
   - Consulta nóminas y asistencias
   - Aprueba o rechaza solicitudes de permisos
   - Accede a reportes y estadísticas

3. **Empleado**
   - Consulta su información personal y hoja de vida
   - Revisa sus horarios de trabajo
   - Consulta sus nóminas y liquidaciones
   - Solicita permisos y ausencias
   - Registra asistencias

#### 🖥️ Sistema Principal
**Sistema Chrispar HR**
- Sistema web full-stack (Flask + React)
- Gestión centralizada de:
  - Empleados y usuarios
  - Cargos y permisos
  - Nóminas y rubros salariales
  - Horarios de trabajo
  - Asistencias y control de entrada/salida
  - Permisos y ausencias
  - Hojas de vida
  - Logs de auditoría

#### 🔗 Sistemas Externos
1. **PostgreSQL Database**
   - Base de datos relacional principal
   - Almacena toda la información del sistema
   - Tablas: usuarios, empleados, cargos, nóminas, rubros, horarios, asistencias, permisos, hojas_vida, logs

2. **Sistema de Email**
   - Envío de notificaciones automáticas
   - Alertas de nóminas procesadas
   - Notificaciones de permisos aprobados/rechazados
   - Recordatorios de cumpleaños y fechas importantes

3. **Sistema de Autenticación JWT**
   - Gestión de tokens de autenticación
   - Autorización basada en roles
   - Control de acceso a recursos según permisos del cargo

#### 🔄 Relaciones Principales
- **Usuarios → Sistema Chrispar HR**: Interacción vía web (HTTPS/JSON)
- **Sistema → PostgreSQL**: Operaciones CRUD (SQL/TCP)
- **Sistema → Email**: Envío de notificaciones (SMTP)
- **Sistema → JWT Auth**: Validación de credenciales y generación de tokens (HTTPS/JSON)
- **Email → Usuarios**: Notificaciones y alertas por correo electrónico

## 🛠️ Cómo Visualizar los Diagramas

### Opción 1: PlantUML Online (Recomendado)
1. Visita [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
2. Copia el contenido del archivo `.puml`
3. Pega en el editor online
4. El diagrama se generará automáticamente

### Opción 2: Visual Studio Code con PlantUML
1. Instala la extensión "PlantUML" de jebbs
2. Abre el archivo `.puml` en VS Code
3. Presiona `Alt+D` para ver la vista previa
4. O usa el comando: "PlantUML: Preview Current Diagram"

### Opción 3: Generar Imagen Localmente

#### Requisitos:
- Java JRE 8 o superior
- GraphViz (opcional, mejora la renderización)

#### Instalación de PlantUML:
```bash
# Windows (con Chocolatey)
choco install plantuml

# macOS (con Homebrew)
brew install plantuml

# Linux (Ubuntu/Debian)
sudo apt-get install plantuml
```

#### Generar PNG:
```bash
plantuml c4-nivel1-contexto.puml
```

#### Generar SVG (recomendado para web):
```bash
plantuml -tsvg c4-nivel1-contexto.puml
```

## 📚 Modelo C4

El modelo C4 (Context, Containers, Components, Code) es un enfoque para visualizar la arquitectura de software en diferentes niveles de abstracción:

- **Nivel 1 - Contexto**: Vista general del sistema y sus relaciones (este diagrama)
- **Nivel 2 - Contenedores**: Aplicaciones y almacenes de datos (próximo)
- **Nivel 3 - Componentes**: Componentes dentro de cada contenedor
- **Nivel 4 - Código**: Diagramas de clases (opcional)

## 🔗 Referencias
- [C4 Model](https://c4model.com/)
- [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML)
- [PlantUML Documentation](https://plantuml.com/)

## 📝 Notas
- Los diagramas se actualizan conforme evoluciona el sistema
- Última actualización: Diciembre 2025
- Mantenedor: Equipo de Desarrollo Chrispar HR
