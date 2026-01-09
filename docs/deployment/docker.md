# Guía de Prácticas de Docker para Exposición
## Sistema CHRISPAR HHRR - Demostración de Contenedores

---

## 1. DEMOSTRACIÓN DE INDEPENDENCIA Y CONECTIVIDAD

### 1.1 Verificar Estado Inicial de Todos los Contenedores

```powershell
# Ver todos los contenedores de CHRISPAR
docker ps --filter "name=chrispar" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Salida esperada:**
```
NAMES                          STATUS              PORTS
chrispar_backend               Up 10 minutes       0.0.0.0:5000->5000/tcp
chrispar_frontend              Up 10 minutes       0.0.0.0:3000->3000/tcp
chrispar_postgres_primary      Up 10 minutes       0.0.0.0:5434->5432/tcp
chrispar_postgres_mirror       Up 10 minutes       0.0.0.0:5433->5432/tcp
```

---

### 1.2 PRÁCTICA 1: Apagar Backend y Probar Frontend

**Objetivo:** Demostrar que Frontend y Backend son servicios independientes.

#### Paso 1: Verificar que el sistema funciona normalmente
```powershell
# Abrir el frontend en el navegador
Start-Process "http://localhost:3000"
```
✅ El frontend carga correctamente  
✅ Intenta hacer login → **Funciona**

#### Paso 2: Apagar el Backend
```powershell
docker stop chrispar_backend
```

#### Paso 3: Intentar usar la aplicación
```powershell
# Recargar la página del frontend
Start-Process "http://localhost:3000"
```

**Comportamiento esperado:**
- ✅ El Frontend **sigue funcionando** (carga la página)
- ❌ Al intentar login → **Error de conexión** (no puede comunicarse con la API)
- 🔍 Abrir DevTools del navegador (F12) → Ver errores de red: `ERR_CONNECTION_REFUSED` o `500 Internal Server Error`

#### Paso 4: Verificar logs del Frontend
```powershell
docker logs chrispar_frontend --tail 20
```
**Verás errores** como: `Error: connect ECONNREFUSED` o `fetch failed`

#### Paso 5: Encender nuevamente el Backend
```powershell
docker start chrispar_backend

# Verificar que está funcionando
docker ps --filter "name=chrispar_backend"
```

#### Paso 6: Probar el sistema nuevamente
- Recargar el frontend
- Intentar login → **Ahora funciona** ✅

**Conclusión:** Frontend y Backend son servicios independientes que se comunican mediante HTTP.

---

### 1.3 PRÁCTICA 2: Apagar Primary Database y Ver el Efecto

**Objetivo:** Demostrar la dependencia entre Backend y Base de Datos.

#### Paso 1: Sistema funcionando normalmente
```powershell
# Probar consulta a la API
curl http://localhost:5000/api/empleados/
```
✅ Retorna datos correctamente

#### Paso 2: Apagar la base de datos primary
```powershell
docker stop chrispar_postgres_primary
```

#### Paso 3: Intentar usar la API
```powershell
curl http://localhost:5000/api/empleados/
```

**Resultado esperado:**
```json
{
  "error": "Database connection failed"
}
```

#### Paso 4: Ver logs del Backend
```powershell
docker logs chrispar_backend --tail 20
```
Verás errores de PostgreSQL: `Connection refused` o `could not connect to server`

#### Paso 5: Demostrar que el Mirror sigue funcionando
```powershell
# Verificar que el mirror está activo
docker ps --filter "name=chrispar_postgres_mirror"

# Conectarse al mirror manualmente
docker exec -it chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT COUNT(*) FROM empleados;"
```
✅ El mirror **sigue funcionando independientemente**

#### Paso 6: Reiniciar Primary
```powershell
docker start chrispar_postgres_primary

# Esperar a que esté healthy
Start-Sleep -Seconds 5

# Probar API nuevamente
curl http://localhost:5000/api/empleados/
```
✅ Funciona de nuevo

---

### 1.4 PRÁCTICA 3: Independencia del Frontend

**Objetivo:** Demostrar que Frontend puede detenerse sin afectar Backend.

#### Paso 1: Apagar Frontend
```powershell
docker stop chrispar_frontend
```

#### Paso 2: Probar Backend directamente
```powershell
# La API sigue funcionando
curl http://localhost:5000/api/empleados/
curl http://localhost:5000/api/mirror/status
```
✅ Backend sigue respondiendo perfectamente

#### Paso 3: Encender Frontend
```powershell
docker start chrispar_frontend
```

---

### 1.5 PRÁCTICA 4: Demostración de la Base de Datos Espejo

**Objetivo:** Mostrar la independencia y sincronización del mirror.

#### Paso 1: Verificar datos en ambas bases
```powershell
# En PRIMARY
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT COUNT(*) FROM empleados;"

# En MIRROR
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT COUNT(*) FROM empleados;"
```
✅ Deben tener el mismo número de registros

#### Paso 2: Apagar el Mirror temporalmente
```powershell
docker stop chrispar_postgres_mirror
```

#### Paso 3: Insertar datos en Primary mientras Mirror está apagado
```powershell
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO cargos (nombre_cargo, sueldo_base) VALUES ('Cargo Demo', 2000);"
```

#### Paso 4: Verificar que Primary funciona sin Mirror
```powershell
curl http://localhost:5000/api/cargos/
```
✅ El sistema sigue funcionando

#### Paso 5: Encender Mirror y ver auto-sincronización
```powershell
docker start chrispar_postgres_mirror

# Esperar 3 segundos para la sincronización
Start-Sleep -Seconds 3

# Verificar que los datos se replicaron
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT * FROM cargos WHERE nombre_cargo = 'Cargo Demo';"
```
✅ **El cargo insertado aparece automáticamente** en el mirror

---

## 2. EXPLICACIÓN TÉCNICA DE LA CONFIGURACIÓN

### 2.1 Análisis del Dockerfile del Backend

```powershell
# Ver el Dockerfile del backend
Get-Content backend/Dockerfile
```

**Explicación línea por línea:**

```dockerfile
# 1. Imagen base - Python 3.11 sobre Debian slim
FROM python:3.11-slim
```
📌 **Por qué:** Imagen ligera de Python, reduce el tamaño del contenedor.

```dockerfile
# 2. Establecer directorio de trabajo
WORKDIR /app
```
📌 **Por qué:** Todas las rutas serán relativas a `/app` dentro del contenedor.

```dockerfile
# 3. Copiar archivo de dependencias
COPY requirements.txt .
```
📌 **Por qué:** Se copia primero para aprovechar la caché de Docker (si no cambian las dependencias, no se reinstalan).

```dockerfile
# 4. Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt
```
📌 **Por qué:** `--no-cache-dir` reduce el tamaño de la imagen al no guardar caché de pip.

```dockerfile
# 5. Copiar todo el código
COPY . .
```
📌 **Por qué:** Copia todo el código fuente al contenedor.

```dockerfile
# 6. Exponer el puerto
EXPOSE 5000
```
📌 **Por qué:** Documenta qué puerto usa la aplicación (informativo, no obligatorio).

```dockerfile
# 7. Comando de inicio
CMD ["python", "app.py"]
```
📌 **Por qué:** Define cómo se ejecuta la aplicación al iniciar el contenedor.

---

### 2.2 Análisis del Dockerfile del Frontend

```powershell
Get-Content frontend/Dockerfile
```

**Estructura típica:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Explicación:**
- `node:18-alpine`: Imagen de Node.js ligera
- `npm install`: Instala dependencias de Node.js
- `npm start`: Inicia React/Angular/Vue

---

### 2.3 Sincronización de Código con Volumes

**En docker-compose.yml:**

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  volumes:
    - ./backend:/app  # 👈 Sincronización bidireccional
```

#### Demostración práctica:

**Paso 1: Verificar contenido actual**
```powershell
docker exec chrispar_backend ls -la /app
```

**Paso 2: Crear archivo localmente**
```powershell
# Crear archivo de prueba
echo "# Archivo de prueba" > backend/TEST_SYNC.md
```

**Paso 3: Verificar que aparece en el contenedor**
```powershell
docker exec chrispar_backend cat /app/TEST_SYNC.md
```
✅ El archivo **aparece inmediatamente** en el contenedor

**Paso 4: Modificar código y ver hot-reload**
```powershell
# Abrir app.py y agregar un print
code backend/app.py
```

Agregar al final de `create_app()`:
```python
print(">>> Código sincronizado automáticamente <<<")
```

**Paso 5: Ver logs del contenedor**
```powershell
docker logs chrispar_backend --tail 10 -f
```
✅ Verás: `* Restarting with stat` y el mensaje aparece automáticamente

---

### 2.4 Configuración de Red (Network)

```powershell
# Ver redes de Docker
docker network ls

# Inspeccionar la red de CHRISPAR
docker network inspect chrispar_hhrr_chrispar_network
```

**Explicación:**
- Todos los contenedores están en la misma red `chrispar_network`
- Se comunican usando nombres de contenedor como DNS:
  - Backend → `postgres_primary:5432`
  - Frontend → `backend:5000`

#### Demostración:

```powershell
# Desde el backend, hacer ping al primary
docker exec chrispar_backend ping -c 3 postgres_primary
```
✅ Funciona porque están en la misma red

---

### 2.5 Variables de Entorno

```powershell
# Ver variables de entorno del backend
docker exec chrispar_backend env | Select-String "DATABASE"
```

**Resultado esperado:**
```
DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar
```

**Explicación:**
- Las variables vienen del archivo `backend/.env`
- Se inyectan al contenedor mediante `env_file` en docker-compose

---

## 3. GESTIÓN INDIVIDUAL DE CONTENEDORES

### 3.1 Comandos Básicos de Administración

```powershell
# Ver todos los contenedores
docker ps -a

# Iniciar un contenedor específico
docker start chrispar_backend

# Detener un contenedor
docker stop chrispar_backend

# Reiniciar un contenedor
docker restart chrispar_backend

# Ver logs en tiempo real
docker logs chrispar_backend -f

# Ejecutar comando dentro del contenedor
docker exec -it chrispar_backend bash

# Ver recursos usados
docker stats chrispar_backend

# Inspeccionar configuración completa
docker inspect chrispar_backend
```

---

### 3.2 Comandos Docker Compose

```powershell
# Levantar todos los servicios
docker-compose up -d

# Levantar solo un servicio
docker-compose up -d backend

# Detener todos los servicios
docker-compose down

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Reconstruir una imagen
docker-compose build backend

# Reconstruir y reiniciar
docker-compose up -d --build backend

# Ver estado de los servicios
docker-compose ps
```

---

## 4. DEMOSTRACIÓN COMPLETA PARA LA EXPOSICIÓN

### Script de Demostración Automatizado

```powershell
# === DEMO 1: Verificación Inicial ===
Write-Host "`n=== ESTADO INICIAL ===" -ForegroundColor Green
docker ps --filter "name=chrispar" --format "table {{.Names}}\t{{.Status}}"

# === DEMO 2: Probar Conectividad ===
Write-Host "`n=== PROBANDO API ===" -ForegroundColor Green
curl http://localhost:5000/api/mirror/status

# === DEMO 3: Apagar Backend ===
Write-Host "`n=== APAGANDO BACKEND ===" -ForegroundColor Yellow
docker stop chrispar_backend
Write-Host "Intentar acceder a la API... (debería fallar)"
curl http://localhost:5000/api/empleados/

# === DEMO 4: Encender Backend ===
Write-Host "`n=== ENCENDIENDO BACKEND ===" -ForegroundColor Green
docker start chrispar_backend
Start-Sleep -Seconds 3
curl http://localhost:5000/api/empleados/

# === DEMO 5: Sincronización de Mirror ===
Write-Host "`n=== PROBANDO REPLICACIÓN ===" -ForegroundColor Cyan
Write-Host "Insertando en Primary..."
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO cargos (nombre_cargo, sueldo_base) VALUES ('Test Expo', 3000) RETURNING id_cargo;"

Write-Host "`nVerificando en Mirror (después de 2 segundos)..."
Start-Sleep -Seconds 2
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT * FROM cargos WHERE nombre_cargo = 'Test Expo';"

Write-Host "`n=== DEMOSTRACIÓN COMPLETA ===" -ForegroundColor Green
```

---

## 5. CHECKLIST DE CONCEPTOS A EXPLICAR

### ✅ Independencia de Contenedores
- [ ] Cada contenedor puede iniciarse/detenerse independientemente
- [ ] Frontend funciona sin Backend (pero no puede hacer peticiones)
- [ ] Backend funciona sin Frontend
- [ ] Mirror funciona independiente del Primary

### ✅ Comunicación entre Contenedores
- [ ] Uso de nombres DNS en la red Docker
- [ ] Variables de entorno para configuración
- [ ] Puertos expuestos vs puertos mapeados

### ✅ Dockerfile
- [ ] Explicar cada instrucción (FROM, WORKDIR, COPY, RUN, CMD)
- [ ] Diferencia entre COPY y ADD
- [ ] Optimización con capas y caché
- [ ] Multi-stage builds (si aplica)

### ✅ Docker Compose
- [ ] Orquestación de múltiples servicios
- [ ] Dependencias entre servicios (depends_on)
- [ ] Healthchecks
- [ ] Volúmenes para persistencia y sincronización

### ✅ Volúmenes
- [ ] Persistencia de datos (bases de datos)
- [ ] Sincronización de código (hot-reload)
- [ ] Named volumes vs bind mounts

### ✅ Replicación de Base de Datos
- [ ] Primary y Mirror como contenedores separados
- [ ] Replicación lógica de PostgreSQL
- [ ] Auto-sincronización después de desconexión

---

## 6. PREGUNTAS TÍPICAS DEL DOCENTE

**P: ¿Qué pasa si apago el Frontend?**  
R: El Backend sigue funcionando normalmente. Puedo acceder a la API directamente con curl o Postman.

**P: ¿Cómo se comunican los contenedores?**  
R: A través de una red Docker personalizada (`chrispar_network`). Usan nombres de contenedor como DNS.

**P: ¿Dónde se guardan los datos si reinicio el contenedor?**  
R: En volúmenes de Docker (`pg_primary_data`, `pg_mirror_data`) que persisten aunque se eliminen los contenedores.

**P: ¿Cómo actualizas el código sin reconstruir la imagen?**  
R: Uso bind mounts (`./backend:/app`). Cualquier cambio local se refleja instantáneamente en el contenedor.

**P: ¿Por qué usar Docker?**  
R: 
- Portabilidad (funciona en cualquier OS)
- Aislamiento (no afecta el sistema host)
- Escalabilidad (puedo agregar más mirrors)
- Reproducibilidad (mismo entorno en dev y producción)

---

**Fecha:** Enero 2026  
**Proyecto:** CHRISPAR HHRR  
**Tecnologías:** Docker, Docker Compose, Flask, PostgreSQL, React
