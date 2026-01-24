# Dockerización del proyecto Chrispar HR ✅

Documento técnico para entrega (Tema 4.2). Incluye: descripción del problema, arquitectura dockerizada, explicación de cada contenedor, configuración (redes, volúmenes, variables), archivos Docker y `docker-compose.yml` presentes en el repo, pasos detallados de despliegue, verificación, evidencias y checklist de entrega.

---

## 1. Resumen ejecutivo

Este documento explica la solución de despliegue mediante contenedores para el proyecto Chrispar HR (React + Flask + PostgreSQL). El objetivo es garantizar portabilidad, aislamiento, repetibilidad y capacidad de escalar por componentes. Se incluyen instrucciones para levantar el entorno con un solo comando y evidencias necesarias para la entrega.

---

## 2. Descripción del problema y objetivo

**Problema:** desplegar un sistema web completo de forma portable y escalable, asegurando que cada componente (frontend, backend, base de datos) se ejecute de forma independiente y reproducible.  

**Objetivo:** dockerizar la aplicación dividiendo responsabilidades en contenedores, documentar el proceso y asegurar interoperabilidad entre servicios.

---

## 3. Arquitectura dockerizada (estado del repo)

En este repositorio ya existe una configuración completa en `docker-compose.yml` que define los servicios principales:
- `postgres_primary`: base de datos principal (Postgres 16, con configuraciones para replicación)
- `postgres_mirror`: base espejo (opcional para replicación)
- `replication_setup`: script para preparar replicación (opcional)
- `backend`: aplicación Flask (ruta `backend/`)
- `frontend`: aplicación React (ruta `frontend/`)
- `restore_backup`: job opcional para restaurar backups

Red interna: `chrispar_network`.  
Volúmenes persistentes: `pg_primary_data`, `pg_mirror_data`.

> Nota: este `docker-compose.yml` ya contempla la capa de base espejo y scripts de replicación, por lo que cumple los requisitos extra si se usan correctamente.

---

## 4. Descripción de cada contenedor y responsabilidades

- `postgres_primary` (Postgres 16): almacena los datos de producción. Variables críticas: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. Persistencia mediante volumen.

- `postgres_mirror` (Postgres 16 - opcional): contenedor espejo para replicación o pruebas de failover. Persistencia por volumen.

- `backend` (Flask + Gunicorn): expone API REST en `:5000`. Se conecta a `postgres_primary` según `backend/.env`. El contenedor incluye `entrypoint.sh` que espera a la BD y arranca Gunicorn. (Recomendación: habilitar `flask db upgrade` en el `entrypoint` o ejecutarlo manualmente después de levantar.)

- `frontend` (React): en desarrollo se ejecuta con `npm start` (puerto 3000); en producción puede servirse como `build/` a través de Nginx (opción recomendada para la entrega final).

- `replication_setup` y `restore_backup`: jobs auxiliares para configuración inicial y restauración.

---

## 5. Archivos claves en el repo (qué revisar)

- `docker-compose.yml` (raíz) — configuración completa de servicios, redes y volúmenes.
- `backend/Dockerfile` — imagen backend (ya presente en `backend/`).
- `backend/entrypoint.sh` — espera DB y arranque de Gunicorn. Revisar la línea de migraciones.
- `backend/.env` — variables de entorno de ejemplo y modos de ejecución (docker o local).
- `frontend/Dockerfile` — imagen de desarrollo; para producción, convierte a multi-stage con Nginx como se recomienda en la sección de anexos.
- `docker/replication/` — scripts usados por `replication_setup`.

---

## 6. Pasos reproducibles para evaluación (con comandos)

1. Clonar el repositorio:

```bash
git clone https://github.com/JosuePalma1/chrispar_RH.git
cd chrispar_HHRR
```

2. Revisar y ajustar variables (opcional):
- Editar `backend/.env` si quieres usar modo Docker (`DATABASE_URL` apuntando a `postgres_primary`), o para usar una BD local.
- Editar `frontend/.env` si necesitas cambiar `REACT_APP_API_URL`.

3. Levantar el entorno completo (replicación incluida opcionalmente):

```bash
docker-compose up --build -d
```

> Si usas replicación, espera a que `replication_setup` termine y confirme éxito en los logs.

4. Aplicar migraciones (si no están habilitadas en `entrypoint`):

```bash
docker-compose exec backend python -m flask db upgrade
```

5. Verificar servicios:

```bash
docker-compose ps
curl http://localhost:5000/api/health
# Abrir http://localhost:3000 para frontend (dev) o configurar Nginx para el build
```

6. Parar y limpiar (al final):

```bash
docker-compose down -v
```

---

## 7. Verificación funcional y evidencias (qué incluir en el informe)

Capturas / video corto que debes adjuntar:
- `docker-compose ps` mostrando todos los servicios arriba.
- `docker logs backend` y `docker logs postgres_primary` con mensajes de arranque exitoso.
- Pantalla de login en el frontend y la respuesta del backend con token JWT.
- Acceso a rutas protegidas (ej. `/api/empleados`) con token.
- Pantalla de dashboard funcionando.

Además, incluye las siguientes salidas en anexos:
- `docker-compose.yml` completo y comentarios explicativos.
- `backend/Dockerfile`, `frontend/Dockerfile` (o `frontend/Dockerfile.prod`).

---

## 8. Dificultades encontradas y soluciones (ejemplos)

- Problema: `backend` arranca antes de que Postgres esté listo.  
  Solución: `entrypoint.sh` ya implementa un loop con `nc` para esperar; recomendamos asegurar que la comprobación de healthcheck esté activa.

- Problema: Migraciones no aplicadas automáticamente.  
  Solución: habilitar `flask db upgrade` en `entrypoint.sh` o ejecutar la migración manualmente tras levantar los servicios.

- Problema: Frontend en modo dev no sirve como build optimizado.  
  Solución: agregar `frontend/Dockerfile.prod` (multi-stage) para servir `build/` con Nginx en producción.

---

## 9. Checklist de entrega (lista lista para imprimir)

- [ ] `docker-compose up --build -d` levanta todos los servicios.
- [ ] `postgres_primary` y `postgres_mirror` (si aplica) están en estado healthy.
- [ ] `backend` responde en `/api/health`.
- [ ] Login funciona y retorna JWT.
- [ ] Dashboard consume rutas protegidas correctamente.
- [ ] README del repo incluye instrucciones claras para Docker.
- [ ] Evidencias (capturas / video) agregadas al informe PDF.

---

## 10. Anexos técnicos (snippets útiles y recomendaciones)

- Para producción, generar `frontend/Dockerfile.prod` con multi-stage y servir con Nginx.
- Considerar respaldos automáticos del volumen de Postgres y scripts de restore (ya existe `docker/restore_backup.sh`).
- Usar `env_file` en `docker-compose.yml` para no versionar secretos.

---

### ¿Siguiente paso?  
Si quieres, realizo estas acciones concretas:  
- (Recomendado) Crear `frontend/Dockerfile.prod` y `docker-compose.override.yml` para versión de producción.  
- (Opcional) Habilitar migraciones automáticas en `backend/entrypoint.sh` y añadir `healthcheck` más detallado.  
- (Opcional) Generar capturas de pantalla y un mini-script de verificación para automatizar pruebas de despliegue.

Dime cuál de estas acciones quieres que ejecute ahora y lo hago.  

---

*Documento preparado para entrega — adaptado a la configuración actual del repositorio.*
