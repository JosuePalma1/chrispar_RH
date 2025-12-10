# 🚀 Guía Rápida: Visualización de Diagramas

## ⚡ Forma más rápida (Recomendada)

### 1. Usar PlantUML Online Server
1. Abre [PlantUML Online](http://www.plantuml.com/plantuml/uml/)
2. Copia el contenido de cualquier archivo `.puml` (por ejemplo, `c4-nivel1-contexto.puml`)
3. Pégalo en el editor
4. ¡El diagrama aparece automáticamente!

**Ventajas:** No necesitas instalar nada, funciona inmediatamente

---

## 💻 Usar VS Code (Para desarrollo)

### Instalación de la extensión
1. Abre VS Code
2. Ve a Extensions (Ctrl+Shift+X)
3. Busca "PlantUML" por jebbs
4. Instala la extensión

### Visualizar diagramas
1. Abre cualquier archivo `.puml`
2. Presiona `Alt+D` para ver preview
3. O usa: `Ctrl+Shift+P` → "PlantUML: Preview Current Diagram"

**Ventajas:** Edición y preview en tiempo real

---

## 🖼️ Generar imágenes (PNG/SVG)

### Requisitos previos
- Java JRE 8+
- PlantUML JAR

### Instalación rápida

#### Windows (con Chocolatey)
```powershell
choco install plantuml
```

#### macOS (con Homebrew)
```bash
brew install plantuml
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install plantuml
```

### Generar diagramas

#### PNG (para documentos)
```bash
cd docs/diagrams
plantuml c4-nivel1-contexto.puml
# Genera: c4-nivel1-contexto.png
```

#### SVG (recomendado para web)
```bash
plantuml -tsvg c4-nivel1-contexto.puml
# Genera: c4-nivel1-contexto.svg
```

#### Generar todos los diagramas
```bash
plantuml *.puml
# Genera PNG de todos los archivos .puml
```

---

## 📱 Visualización Online Alternativa

### PlantText
- URL: [https://www.planttext.com/](https://www.planttext.com/)
- Pega el código y obtén el diagrama

### PlantUML QEditor
- URL: [https://qeditor.plantuml.com/](https://qeditor.plantuml.com/)
- Editor mejorado con funciones extra

---

## 🎯 Diagramas Disponibles

| Archivo | Descripción | Nivel |
|---------|-------------|-------|
| `c4-nivel1-contexto.puml` | Vista general del sistema | C4 Nivel 1 |
| `c4-nivel1-contexto-detallado.puml` | Vista detallada con más información técnica | C4 Nivel 1 |

---

## 💡 Tips

- **Para presentaciones**: Usa SVG (escala sin perder calidad)
- **Para documentos Word/PDF**: Usa PNG con alta resolución
- **Para desarrollo**: Usa VS Code con preview en tiempo real
- **Para compartir rápido**: Usa PlantUML Online y comparte el enlace

---

## 🔗 Enlaces Útiles

- [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
- [C4-PlantUML GitHub](https://github.com/plantuml-stdlib/C4-PlantUML)
- [PlantUML Documentation](https://plantuml.com/)
- [C4 Model Official Site](https://c4model.com/)

---

## ❓ Problemas Comunes

### "No se genera la imagen"
**Solución:** Verifica que Java esté instalado: `java -version`

### "PlantUML no funciona en VS Code"
**Solución:** 
1. Instala GraphViz: `choco install graphviz` (Windows) o `brew install graphviz` (macOS)
2. Reinicia VS Code

### "Error al compilar diagrama"
**Solución:** Verifica que la sintaxis sea correcta, especialmente las llaves `{` y `}`

---

**¿Necesitas ayuda?** Contacta al equipo de desarrollo.
