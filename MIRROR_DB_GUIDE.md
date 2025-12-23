# 📚 Guía de Base de Datos Espejo (Mirror DB)

Este proyecto soporta dos formas de trabajar con la base de datos espejo. Aquí tienes los pasos sencillos para cada una.

**Archivo de Configuración:** 👉 [backend/.env](backend/.env)

---

## 🐳 Opción 1: Modo Docker
Este modo simula un entorno real con dos servidores de base de datos separados. Es el que configuramos paso a paso.

### Pasos para iniciar desde cero:

1.  **Encender los contenedores**
    Abre una terminal en la raíz del proyecto y ejecuta:
    ```powershell
    docker compose up -d postgres_primary postgres_mirror
    ```

2.  **Crear las tablas (Solo la primera vez)**
    Necesitamos crear la estructura en ambas bases de datos.
    ```powershell
    cd backend
    # Base Principal
    $env:DATABASE_URL="postgresql://postgres:123@localhost:5434/chrispar"; flask db upgrade
    # Base Espejo
    $env:DATABASE_URL="postgresql://postgres:123@localhost:5433/chrispar"; flask db upgrade
    ```

3.  **Conectar la replicación**
    Vuelve a la raíz y ejecuta el script de conexión:
    ```powershell
    cd ..
    docker compose --profile replication up replication_setup
    ```

4.  **Configurar el Backend**
    Asegúrate de que tu archivo `backend/.env` tenga activada la **Opción 1**:
    ```ini
    DATABASE_URL=postgresql://postgres:123@localhost:5434/chrispar
    MIRROR_DATABASE_URL=postgresql://postgres:123@localhost:5433/chrispar
    ```

5.  **Crear usuario Admin (Si está vacía)**
    ```powershell
    cd backend
    python inicializar_db.py
    ```

---

## 🏠 Opción 2: Modo Schema (Local Simple)
Este modo es útil si no quieres usar Docker y prefieres usar el PostgreSQL que tienes instalado en Windows. Crea una copia "virtual" dentro de la misma base de datos.

### Pasos para configurar:

1.  **Tener PostgreSQL corriendo**
    Asegúrate de que tu servicio de PostgreSQL local esté iniciado (puerto 5432).

2.  **Configurar el Backend**
    Edita el archivo `backend/.env` y activa la **Opción 2** (comenta las líneas de Docker):
    ```ini
    DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar
    # MIRROR_DATABASE_URL debe estar comentado o borrado
    ```

3.  **Iniciar la aplicación**
    Simplemente corre el backend. El sistema detectará que no hay URL de espejo y configurará automáticamente los triggers locales.
    ```powershell
    cd backend
    python app.py
    ```
    *Verás un mensaje: `[Mirror] PostgreSQL schema 'mirror': OK`*

---

## 🛠️ Solución de Problemas Comunes

### "Credenciales inválidas"
Si acabas de crear los contenedores, la base de datos está vacía.
👉 **Solución:** Ejecuta `python backend/inicializar_db.py` para crear el usuario `admin`.

### "Error Expecting value..." o problemas de JSON
Si ves errores al cargar cargos o permisos.
👉 **Solución:** Ejecuta el script de reparación:
```powershell
cd backend
python fix_json_cargos.py
```

### "¿Cómo sé si está funcionando?"
Cuando inicias el backend (`python app.py`), fíjate en el mensaje de inicio:
- **Modo Docker:** Dirá `[Mirror] Modo externo detectado... Replicación manual requerida.`
- **Modo Schema:** Dirá `[Mirror] PostgreSQL schema 'mirror': OK`

### "Error: Can't locate revision identified by..." (Problema de Migraciones)
Este error ocurre cuando la base de datos espera una versión de migración que no existe en tu código (común al trabajar en equipo).

**Síntomas:**
- `flask db upgrade` falla con `Can't locate revision identified by 'xxxx'`.
- `flask db stamp head` no lo arregla.

**Solución Segura (Sin borrar datos):**
1.  Abre **pgAdmin** y conéctate a la base de datos problemática (puerto 5434 o 5432).
2.  Abre el **Query Tool** y ejecuta:
    ```sql
    SELECT * FROM alembic_version;
    ```
    *(Verás el código de versión 'fantasma' que causa el error)*.
3.  Busca en tu carpeta `migrations/versions` cuál es el código de la última migración real (ej: `937c54b404e8`).
4.  Actualiza manualmente la versión en la base de datos:
    ```sql
    UPDATE alembic_version SET version_num = 'CODIGO_REAL_AQUI';
    ```
    *(Reemplaza `CODIGO_REAL_AQUI` por el código que encontraste en el paso 3)*.
5.  Vuelve a ejecutar `flask db upgrade`.

**⚠️ Regla de Oro para el Equipo:**
- **NUNCA** borren archivos de migración que ya se hayan subido al repositorio.
- **SIEMPRE** ejecuten las migraciones contra la base de datos **PRINCIPAL** (Puerto 5434), nunca contra el espejo.
