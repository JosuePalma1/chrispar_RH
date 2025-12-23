# Base de Datos Espejo (Mirror DB) - Guía Completa

## 🎯 Resumen

Este proyecto implementa una **base de datos espejo** que puede funcionar en dos modos:

1. **Modo Schema** (actual) - Schema `mirror` dentro de la misma BD, replicación con triggers
2. **Modo Externo** (Docker) - BD separada en otro contenedor, replicación lógica

## ✅ Estado Actual: Modo Schema

- **Schema mirror**: Creado en la misma base de datos `chrispar`
- **Tablas espejo**: Todas las tablas de `public` están duplicadas en `mirror`
- **Triggers**: Configurados para INSERT, UPDATE y DELETE
- **Modo**: PostgreSQL Schema Mode (mismo servidor, schemas separados)
- **Auto-setup**: Activado - se configura automáticamente al iniciar el backend
- **Estado**: ✅ Funcionando correctamente

## 🔧 Cómo Funciona

### 1. Al iniciar el backend

Cuando ejecutas `python app.py`, el sistema:

1. Detecta que estás usando PostgreSQL
2. Verifica si `MIRROR_DATABASE_URL` está configurado (modo externo)
3. Si NO está configurado, activa el **modo schema** (actual)
4. Llama a `auto_setup_postgres_schema_mirror()` que:
   - Verifica si el schema `mirror` existe
   - Verifica si los triggers existen
   - Si faltan, los crea automáticamente
   - Si ya existen, simplemente muestra: `[Mirror] PostgreSQL schema 'mirror': OK (ya configurado)`

### 2. Durante operaciones normales

Cuando tu aplicación hace INSERT/UPDATE/DELETE en cualquier tabla de `public`:

```python
# Por ejemplo, crear un nuevo cargo
new_cargo = Cargo(nombre_cargo="Gerente", sueldo_base=5000)
db.session.add(new_cargo)
db.session.commit()
```

**Lo que sucede internamente:**

1. El INSERT se ejecuta en `public.cargos`
2. El trigger `trg_mirror_insert_cargos` se activa automáticamente
3. La función trigger copia el registro a `mirror.cargos`
4. Todo ocurre en la misma transacción (atómico)

Lo mismo aplica para UPDATE y DELETE.

## 📊 Verificación

Puedes verificar que funciona ejecutando:

```bash
cd backend
python test_full_mirror.py
```

Este script prueba las 3 operaciones (INSERT, UPDATE, DELETE) y verifica que se repliquen correctamente.

## 🔍 Inspección Manual

### Ver tablas en el mirror

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'mirror';
```

### Comparar datos

```sql
-- Contar registros en ambos schemas
SELECT 'public' as schema, COUNT(*) FROM public.cargos
UNION ALL
SELECT 'mirror' as schema, COUNT(*) FROM mirror.cargos;
```

### Ver triggers activos

```sql
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND t.tgname LIKE 'trg_mirror_%'
ORDER BY c.relname, t.tgname;
```

## 🌐 Acceso desde el Frontend

Los administradores pueden inspeccionar el mirror DB desde la interfaz web:

1. Login como administrador
2. Ir a **Sistema → BD Espejo** (menú lateral)
3. Ver el estado del mirror y preview de tablas

Endpoint API: `GET /api/mirror/status`

## 📝 Configuración

### Archivo `.env` (modo actual)

```env
DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar
# MIRROR_DATABASE_URL está comentado = modo schema activado
SECRET_KEY=123
```

### Archivo `config.py`

```python
# Modo schema (actual)
MIRROR_SCHEMA = "mirror"
MIRROR_DATABASE_URL = None  # No usar modo externo

# Modo externo (Docker, comentado actualmente)
# MIRROR_DATABASE_URL = "postgresql://postgres:123@localhost:5433/chrispar"
```

## 🐳 Modo Externo (Docker con 2 Contenedores)

### ¿Cuándo usar este modo?

- Producción con alta disponibilidad
- Aislamiento físico entre BD principal y espejo
- Distribución en diferentes servidores

### Diferencias con Modo Schema

| Aspecto | Modo Schema (actual) | Modo Externo (Docker) |
|---------|---------------------|----------------------|
| Ubicación | Mismo servidor PostgreSQL | Contenedores separados |
| Replicación | Triggers automáticos | Publication/Subscription |
| Setup | Automático al iniciar | Manual (una vez) |
| Complejidad | Baja | Media |
| Aislamiento | Lógico (schemas) | Físico (contenedores) |
| Uso recomendado | Desarrollo, demo | Producción |

### Configuración Modo Externo

#### 1. Archivo docker-compose.yml

Ya está configurado en el proyecto con:

```yaml
services:
  postgres_primary:
    image: postgres:16
    ports:
      - "5434:5432"  # 5432 suele estar ocupado por PostgreSQL local en Windows
    environment:
      POSTGRES_DB: chrispar
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 123
    command: postgres -c wal_level=logical

  postgres_mirror:
    image: postgres:16
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: chrispar
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 123
```

#### 2. Levantar contenedores

```bash
# Desde la raíz del proyecto
docker compose up -d postgres_primary postgres_mirror
```

Esto crea:
- `postgres_primary` → puerto host 5434
- `postgres_mirror` → puerto host 5433

#### 3. Sincronizar schemas

⚠️ **IMPORTANTE**: La replicación lógica NO crea tablas automáticamente. Debes crear el mismo schema en ambas BD.

**Opción A - Usando migraciones:**
```bash
# Migrar primary
export DATABASE_URL=postgresql://postgres:123@localhost:5434/chrispar
flask db upgrade

# Migrar mirror
export DATABASE_URL=postgresql://postgres:123@localhost:5433/chrispar
flask db upgrade
```

**Opción B - Usando pg_dump:**
```bash
# Exportar schema del primary (sin datos)
docker exec postgres_primary pg_dump -U postgres -d chrispar --schema-only > schema.sql

# Importar al mirror
docker exec -i postgres_mirror psql -U postgres -d chrispar < schema.sql
```

#### 4. Configurar replicación lógica

```bash
docker compose --profile replication up replication_setup
```

Este comando ejecuta `docker/replication/setup_replication.sh` que:
1. Crea usuario replicador en primary
2. Crea publicación de todas las tablas en primary
3. Crea suscripción en mirror apuntando al primary

#### 5. Configurar backend

**Archivo `.env`:**
```env
DATABASE_URL=postgresql://postgres:123@localhost:5434/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:123@localhost:5433/chrispar
SECRET_KEY=123
```

**Archivo `config.py`:**
```python
# Descomentar esta línea
MIRROR_DATABASE_URL = os.getenv("MIRROR_DATABASE_URL")
```

Al detectar `MIRROR_DATABASE_URL`, el sistema:
- ❌ Desactiva auto-setup de triggers
- ✅ Lee datos del mirror para inspección
- ℹ️ Muestra: "[Mirror] Modo externo detectado (MIRROR_DATABASE_URL). Replicación manual requerida."

#### 6. Verificar replicación

```bash
# Conectarse al mirror
docker exec -it postgres_mirror psql -U postgres -d chrispar

# Ver estado de suscripción
SELECT * FROM pg_stat_subscription;

# Comparar conteos
SELECT 'primary' as db, COUNT(*) FROM cargos;  -- ejecutar en primary
SELECT 'mirror' as db, COUNT(*) FROM cargos;   -- ejecutar en mirror
```

### ¿Por qué no triggers entre contenedores?

PostgreSQL **NO permite** que un trigger escriba directamente a otra base de datos sin extensiones como `postgres_fdw` o `dblink`. Para replicar entre contenedores, la replicación lógica (publication/subscription) es el método estándar y recomendado.

### Troubleshooting Modo Externo

**Error: "could not connect to publisher"**
- Verificar que ambos contenedores estén en la misma red Docker
- Usar nombre de servicio (`postgres_primary`) no `localhost`

**Error: "replication slot already exists"**
- Eliminar suscripción: `DROP SUBSCRIPTION mirror_subscription;`
- Re-ejecutar setup: `docker compose --profile replication up replication_setup`

**Datos no se replican**
- Verificar `wal_level=logical` en primary
- Revisar logs: `docker logs postgres_mirror`
- Confirmar que las tablas existen en ambas BD

## 🎓 Conceptos Clave

### Schema Mode (Actual)
- **Ventaja**: Simple, automático, no requiere configuración extra
- **Desventaja**: Misma base de datos (no hay aislamiento físico)
- **Uso**: Desarrollo, demo, backups lógicos

### External Mode (Docker)
- **Ventaja**: Aislamiento físico, puede estar en otro servidor
- **Desventaja**: Requiere configuración de replicación lógica
- **Uso**: Producción, alta disponibilidad

## 🔥 Problemas Comunes

### "Modo externo detectado"
**Causa**: `MIRROR_DATABASE_URL` está configurado en `config.py`  
**Solución**: Comentar la línea en `config.py` y reiniciar backend

### "Schema mirror no existe"
**Causa**: Primera ejecución o schema eliminado  
**Solución**: Reiniciar backend o llamar `POST /api/mirror/setup`

### "Datos no se replican"
**Causa**: Triggers no están creados  
**Solución**: 
```bash
# Verificar triggers
python -c "from extensions import db; from app import create_app; app = create_app(); from sqlalchemy import text; with app.app_context(): print(db.session.execute(text('SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE \\'trg_mirror_%\\'')).scalar())"
```

## 📚 Archivos Relacionados

- `backend/utils/mirror_db.py` - Funciones de setup y gestión
- `backend/routes/mirror_routes.py` - API endpoints
- `backend/app.py` - Auto-setup en startup
- `frontend/src/components/MirrorDB.js` - UI de inspección
- `backend/test_full_mirror.py` - Script de prueba

## ✨ Conclusión

El sistema de base de datos espejo está completamente funcional y automatizado. Todas las operaciones de escritura se replican instantáneamente al schema `mirror` sin intervención manual.
