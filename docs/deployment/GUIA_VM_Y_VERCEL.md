# Guía de Despliegue: Backend en VM Ubuntu + Frontend en Vercel

Esta guía resume paso a paso cómo desplegar el proyecto **chrispar_RH** cumpliendo las indicaciones del profesor:

- Backend Flask en una **Máquina Virtual Ubuntu Server** con **Docker** y **Nginx** como proxy inverso.
- Frontend React en **Vercel**, apuntando al backend en producción.
- Uso correcto de **variables de entorno** (.env) y modo **producción**.

---

## Guía paso a paso con comandos, advertencias y recomendaciones

> Esta sección es una lista de pasos con comandos, más las advertencias y recomendaciones que necesitas para la defensa.

---

### Paso 1: Conectarte a la VM por SSH

Comando (desde Windows):

```bash
ssh USUARIO@IP_DE_LA_VM
```

- Advertencia: La VM debe estar en modo de red **Bridge** y tener instalado **OpenSSH Server**, si no el SSH fallará.
- Recomendación: Anota la IP de la VM y prueba primero con `ping IP_DE_LA_VM` desde Windows para confirmar conexión.

---

### Paso 2: Actualizar Ubuntu e instalar Docker, docker-compose y Nginx

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl docker.io docker-compose nginx
```

- Advertencia: Estos comandos requieren usuario con permisos sudo; pueden pedir contraseña y tomar varios minutos.
- Recomendación: Ejecuta `systemctl status docker` y `systemctl status nginx` para confirmar que ambos servicios estén **active (running)**.

---

### Paso 3: Crear carpeta del proyecto y clonar el repositorio

```bash
sudo mkdir -p /var/www/backend_proyecto
sudo chown -R $USER:$USER /var/www/backend_proyecto
cd /var/www/backend_proyecto
git clone https://github.com/JosuePalma1/chrispar_RH.git
cd chrispar_RH
```

- Advertencia: Asegúrate de no clonar el proyecto varias veces en rutas distintas, o te confundirás con los `docker-compose.yml`.
- Recomendación: Desde ahora, considera `/var/www/backend_proyecto/chrispar_RH` como la **raíz oficial** del proyecto en la VM.

---

### Paso 4: Crear y configurar el archivo `.env` del backend (producción)

Entrar a la carpeta del backend y crear/editar `.env`:

```bash
cd /var/www/backend_proyecto/chrispar_RH/backend
nano .env
```

Contenido recomendado (modo Docker, ajusta claves reales):

```dotenv
# MODO DOCKER (BD primaria + mirror en contenedores)
FLASK_DEBUG=0
FLASK_ENV=production

DATABASE_URL=postgresql://postgres:TU_PASSWORD@postgres_primary:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:TU_PASSWORD@postgres_mirror:5432/chrispar

SECRET_KEY=clave-secreta-larga-y-segura
JWT_SECRET_KEY=clave-jwt-larga-y-segura
FILE_SERVER_URL=http://localhost:5000/upload
```

- Advertencias:
  - **NO** subir nunca este archivo a GitHub (
.gitignore
 ya lo protege, pero no lo copies fuera del servidor).
  - `FLASK_DEBUG` debe ser **0** y `FLASK_ENV` **production**; si no, el profesor verá errores con tu código y rutas internas.
  - Las credenciales de `DATABASE_URL` y `MIRROR_DATABASE_URL` deben coincidir con las del `docker-compose.yml` (usuario, contraseña y nombre de BD).
- Recomendaciones:
  - Después de guardar, verifica su existencia con:

    ```bash
    ls -la .env
    cat .env
    ```

  - Genera claves seguras (por ejemplo desde Python) en lugar de usar `123` o textos cortos.

---

### Paso 5: Levantar la base de datos, mirror y backend con Docker

Desde la raíz del proyecto (donde está `docker-compose.yml`):

```bash
cd /var/www/backend_proyecto/chrispar_RH
docker compose up -d --build
docker ps
```

- Advertencias:
  - El primer `docker compose up --build` puede tardar porque descarga imágenes y construye el backend.
  - Si el backend falla al iniciar, revísalo con `docker logs NOMBRE_DEL_CONTENEDOR_BACKEND`.
- Recomendaciones:
  - Asegúrate de que existan contenedores para **postgres_primary**, **postgres_mirror** y el backend Flask.
  - Espera unos segundos después de levantar los contenedores antes de probar el backend.

---

### Paso 6: Configurar firewall (UFW) y Nginx como proxy inverso

Permitir solo SSH y Nginx:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

- Advertencias:
  - Si bloqueas el puerto SSH (22) por error, podrías perder acceso remoto a la VM.
  - **No** abras puertos internos de Docker (5000, 5432, etc.) hacia internet.
- Recomendación: Después de `ufw enable`, revisa el estado con `sudo ufw status`.

Configurar el sitio de Nginx:

```bash
sudo nano /etc/nginx/sites-available/chrispar_backend
```

Configuración mínima (ajusta puerto si el backend expone otro):

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Activar el sitio y reiniciar Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/chrispar_backend /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

- Advertencias:
  - `sudo nginx -t` debe decir **syntax is OK**; si hay errores, Nginx no cargará la nueva config.
  - Borrar el sitio `default` evita conflictos, pero hazlo solo si ya tienes tu sitio configurado.
- Recomendaciones:
  - Si cambias el puerto interno del backend (por ejemplo a 8000), también actualiza `proxy_pass`.
  - Usa `sudo journalctl -u nginx -f` si necesitas ver logs de Nginx en vivo.

---

### Paso 7: Probar el backend desde tu PC

Desde PowerShell o CMD en Windows:

```bash
curl http://IP_DE_LA_VM/api/health
```

- Advertencias:
  - Este endpoint debe existir en tu backend; si no, ajusta la ruta de salud que vayas a mostrar al profesor.
  - Si el comando no responde, revisa: IP de la VM, firewall UFW y que los contenedores estén levantados.
- Recomendaciones:
  - También puedes abrir `http://IP_DE_LA_VM/api/health` en el navegador para mostrarlo visualmente.

---

### Paso 8: Configurar el frontend en Vercel

Configuración básica en la interfaz web de Vercel:

1. Iniciar sesión en https://vercel.com (con GitHub).
2. **Add New → Project** y seleccionar el repo `JosuePalma1/chrispar_RH`.
3. En **Root Directory**, elegir la carpeta `frontend`.
4. Verificar:
   - Build Command: `npm run build`
   - Output Directory: `build`

Variable de entorno para apuntar al backend:

- Key: `REACT_APP_API_URL`
- Value (ejemplos):
  - `http://IP_DE_LA_VM/api`
  - `https://TU_DOMINIO/api` (si tienes SSL y dominio).

- Advertencias:
  - Cada vez que cambies `REACT_APP_API_URL`, debes hacer **Redeploy** para que React tome la nueva variable.
  - Usa siempre el sufijo `/api` para coincidir con los endpoints del backend.
- Recomendaciones:
  - Guarda la URL final de Vercel (por ejemplo `https://tu-proyecto.vercel.app`) para mostrarla en la exposición.
  - Prueba el login y varias pantallas desde esa URL antes del examen.

---

### Paso 9: Prueba de caída del backend (escenario del profesor)

Apagar el backend desde la VM:

```bash
cd /var/www/backend_proyecto/chrispar_RH
docker compose stop backend
``+

- Advertencias:
  - Mientras el backend esté detenido, todas las peticiones desde el frontend fallarán (esto es intencional para la prueba).
  - No ejecutes este comando antes de tiempo; úsalo solo cuando el profesor te lo pida.
- Recomendaciones:
  - Muestra en el frontend un mensaje controlado tipo "Servidor temporalmente no disponible" en lugar de una pantalla rota.
  - Después de la prueba, vuelve a levantarlo con:

    ```bash
    docker compose start backend
    ```

---

Con estos pasos, comandos, advertencias y recomendaciones tienes una guía completa para reproducir el despliegue Backend en VM Ubuntu + Docker + Nginx y Frontend en Vercel tal como se espera en la evaluación.