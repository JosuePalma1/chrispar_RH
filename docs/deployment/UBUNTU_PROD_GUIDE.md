# Guía de Despliegue en Producción (Ubuntu + Docker + Nginx)

Este documento detalla los pasos para desplegar la aplicación **Chrispar HHRR** en un entorno de producción utilizando una Máquina Virtual Ubuntu, Docker Compose, Gunicorn y Nginx como proxy inverso.

## 1. Requisitos Previos

- Máquina Virtual con Ubuntu Server (20.04 o superior).
- Docker y Docker Compose instalados.
- Repositorio clonado en `/var/www/backend_proyecto/chrispar_RH` (o ruta similar).
- Puertos 80, 443 liberados en el firewall de la VM.

## 2. Preparación del Código (Local)

Antes de desplegar, nos aseguramos de que el backend esté listo para producción:

1.  **Gunicorn**: Se agregó `gunicorn` al `requirements.txt`.
2.  **Entrypoint**: Se modificó `backend/entrypoint.sh` para iniciar con:
    ```bash
    exec gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
    ```
3.  **Dockerfile**: Se actualizó para instalar `netcat` (dependencia del script de espera) y usar el entrypoint correcto.

*Asegúrate de hacer `git push` de estos cambios antes de continuar en la VM.*

## 3. Configuración en el Servidor (VM Ubuntu)

### 3.1. Actualizar Código
```bash
cd /var/www/backend_proyecto/chrispar_RH
git pull origin main
```

### 3.2. Configuración de Variables de Entorno (.env)
Crear o editar `backend/.env` con la configuración de producción:

```properties
FLASK_DEBUG=0
SECRET_KEY=tu_clave_secreta_muy_larga_y_segura
# Conexión interna de Docker - usar nombres de servicio
DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar
# URL para Failover automático
MIRROR_DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar
```

### 3.3. Configuración de Docker Compose
Editar `docker-compose.yml` para habilitar replicación bidireccional y alta disponibilidad:

**Puntos clave modificados:**
- **postgres_mirror**: Agregar comando `wal_level=logical`.
- **backend**: Comentar la línea `- ./backend:/app` en `volumes` para usar la imagen compilada y no el código en vivo (mejor estabilidad).
- **replication_setup**: 
    - Apuntar volumen a `setup_bidirectional_replication.sh`.
    - Agregar variables de entorno para slots y publicaciones (`PRIMARY_PUB_NAME`, etc.).

### 3.4. Configuración de Nginx (Proxy Inverso)
Nginx se encarga de recibir el tráfico HTTPS y separarlo. Como el Frontend está en Vercel, Nginx solo maneja la API.

Archivo: `/etc/nginx/sites-enabled/default` (o tu sitio configurado):

```nginx
server {
    listen 80;
    server_name TU_IP_PUBLICA;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name TU_IP_PUBLICA;

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    # Enruta todo el tráfico al Backend (Gunicorn)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Headers CORS para permitir peticiones desde Vercel
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PATCH, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type' always;
    }
}
```

## 4. Despliegue y Reinicio

Para aplicar todos los cambios de configuración y base de datos:

1.  **Limpiar contenedores anteriores** (Precaución: Borra datos de BD si no tienes persistencia externa configurada):
    ```bash
    sudo docker-compose down -v
    ```
    *Si hay conflictos de nombres, borrar manualmente: `sudo docker rm -f chrispar_backend`*

2.  **Reconstruir e Iniciar**:
    ```bash
    sudo docker-compose up -d --build
    ```

## 5. Verificación

1.  **Logs de Backend**: `sudo docker logs chrispar_backend`
    *   Debe decir: `[INFO] Starting gunicorn ...`
2.  **Logs de Replicación**: `sudo docker logs chrispar_replication_setup`
    *   Debe terminar con éxito confirmando la replicación bidireccional.
3.  **Prueba de API**: Navegar a `https://TU_IP/api/health` desde el exterior.
