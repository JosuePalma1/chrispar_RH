# Guía de Despliegue: Backend en Ubuntu Server + Nginx

## 📋 Requisitos Previos
- Máquina Virtual con Ubuntu Server 22.04 LTS instalado
- Acceso SSH a la VM
- Mínimo 2GB RAM, 20GB disco
- Conexión a internet

---

## 🚀 Paso 1: Instalación de Ubuntu Server en VM

### 1.1 Descargar Ubuntu Server
```bash
# Descarga desde: https://ubuntu.com/download/server
# Versión recomendada: Ubuntu Server 22.04 LTS
```

### 1.2 Crear VM en VirtualBox/VMware
- **RAM**: 2GB mínimo
- **Disco**: 20GB
- **Red**: Modo Puente (Bridge) o NAT con Port Forwarding
- **Puertos a mapear (si usas NAT)**:
  - Puerto 22 (SSH): Host 2222 → Guest 22
  - Puerto 80 (HTTP): Host 80 → Guest 80
  - Puerto 443 (HTTPS): Host 443 → Guest 443
  - Puerto 5000 (Flask): Host 5000 → Guest 5000

### 1.3 Instalación de Ubuntu
Durante la instalación:
- **Perfil de red**: Configurar IP estática (recomendado)
- **SSH**: Habilitar OpenSSH Server
- **Usuario**: Crear usuario con contraseña segura

---

## 🔧 Paso 2: Configuración Inicial del Servidor

### 2.1 Conectar por SSH
```bash
# Desde tu máquina Windows (PowerShell)
ssh usuario@IP_DE_TU_VM

# Ejemplo:
ssh josue@192.168.1.100
```

### 2.2 Actualizar el Sistema
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential git curl wget
```

### 2.3 Instalar Python 3.11+ y Herramientas
```bash
# Instalar Python y pip
sudo apt install -y python3 python3-pip python3-venv

# Verificar versión
python3 --version

# Instalar PostgreSQL Client (para conectarte a tu BD externa)
sudo apt install -y postgresql-client
```

---

## 📦 Paso 3: Clonar y Configurar el Backend

### 3.1 Crear Directorio de Aplicación
```bash
# Crear directorio para el proyecto
sudo mkdir -p /var/www/chrispar_backend
sudo chown -R $USER:$USER /var/www/chrispar_backend

# Navegar al directorio
cd /var/www/chrispar_backend
```

### 3.2 Clonar el Repositorio
```bash
# Opción 1: Clonar desde GitHub
git clone https://github.com/TU_USUARIO/chrispar_HHRR.git .

# Opción 2: Subir archivos manualmente con SCP desde tu Windows
# En PowerShell (Windows):
# scp -r "C:\Users\josue\OneDrive\Documentos\Universidad\6to semestre\Aplicaciones web II\Proyecto de semestre\chrispar_HHRR\backend\*" usuario@IP_VM:/var/www/chrispar_backend/
```

### 3.3 Crear Entorno Virtual
```bash
cd /var/www/chrispar_backend/backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Instalar Gunicorn (servidor WSGI para producción)
pip install gunicorn
```

### 3.4 Configurar Variables de Entorno de PRODUCCIÓN
```bash
# Crear archivo .env para producción
nano /var/www/chrispar_backend/backend/.env
```

Contenido del `.env` (⚠️ IMPORTANTE: Usa credenciales de producción):
```env
# BASE DE DATOS - Conectar a tu BD en Docker o servidor externo
DATABASE_URL=postgresql://postgres:TU_PASSWORD_SEGURO@IP_DE_TU_BD:5434/chrispar

# MIRROR DATABASE (opcional si usas failover)
MIRROR_DATABASE_URL=postgresql://postgres:TU_PASSWORD_SEGURO@IP_DE_TU_BD:5433/chrispar

# SECRET KEY - GENERA UNA NUEVA PARA PRODUCCIÓN
SECRET_KEY=tu-clave-super-secreta-de-produccion-cambiar-esto

# FLASK ENVIRONMENT
FLASK_ENV=production
FLASK_DEBUG=0

# FILE SERVER
FILE_SERVER_URL=http://IP_DE_TU_SERVIDOR_ARCHIVOS:8000
```

**🔐 Generar SECRET_KEY seguro:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## ⚙️ Paso 4: Instalar y Configurar Gunicorn

### 4.1 Crear Archivo de Configuración Gunicorn
```bash
nano /var/www/chrispar_backend/backend/gunicorn_config.py
```

Contenido:
```python
import multiprocessing

# Dirección de bind
bind = "127.0.0.1:5000"

# Número de workers (2-4 x núcleos CPU)
workers = multiprocessing.cpu_count() * 2 + 1

# Tipo de worker
worker_class = "sync"

# Timeout
timeout = 120

# Logging
accesslog = "/var/log/chrispar/access.log"
errorlog = "/var/log/chrispar/error.log"
loglevel = "info"

# Reiniciar workers después de N requests (evitar memory leaks)
max_requests = 1000
max_requests_jitter = 50
```

### 4.2 Crear Directorios de Logs
```bash
sudo mkdir -p /var/log/chrispar
sudo chown -R $USER:$USER /var/log/chrispar
```

### 4.3 Probar Gunicorn Manualmente
```bash
cd /var/www/chrispar_backend/backend
source venv/bin/activate

# Probar con Gunicorn
gunicorn -c gunicorn_config.py "app:create_app()"

# Si funciona, presiona Ctrl+C para detener
```

---

## 🔄 Paso 5: Crear Servicio Systemd (Auto-inicio)

### 5.1 Crear Archivo de Servicio
```bash
sudo nano /etc/systemd/system/chrispar-backend.service
```

Contenido:
```ini
[Unit]
Description=Chrispar HHRR Backend (Gunicorn)
After=network.target

[Service]
Type=notify
User=TU_USUARIO
Group=www-data
WorkingDirectory=/var/www/chrispar_backend/backend
Environment="PATH=/var/www/chrispar_backend/backend/venv/bin"
ExecStart=/var/www/chrispar_backend/backend/venv/bin/gunicorn \
    -c /var/www/chrispar_backend/backend/gunicorn_config.py \
    "app:create_app()"

# Restart automático si falla
Restart=always
RestartSec=10

# Configuración de seguridad
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

**⚠️ Reemplaza `TU_USUARIO` con tu usuario de Ubuntu.**

### 5.2 Habilitar y Iniciar el Servicio
```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar para que inicie al arrancar el servidor
sudo systemctl enable chrispar-backend

# Iniciar el servicio
sudo systemctl start chrispar-backend

# Verificar estado
sudo systemctl status chrispar-backend

# Ver logs en tiempo real
sudo journalctl -u chrispar-backend -f
```

---

## 🌐 Paso 6: Instalar y Configurar Nginx

### 6.1 Instalar Nginx
```bash
sudo apt install -y nginx

# Verificar instalación
nginx -v

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6.2 Configurar Nginx como Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/chrispar-backend
```

Contenido:
```nginx
server {
    listen 80;
    server_name TU_IP_O_DOMINIO;  # Ejemplo: 192.168.1.100 o backend.chrispar.com

    # Logs
    access_log /var/log/nginx/chrispar_access.log;
    error_log /var/log/nginx/chrispar_error.log;

    # Tamaño máximo de archivos
    client_max_body_size 10M;

    # Proxy hacia Gunicorn
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
```

### 6.3 Activar la Configuración
```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/chrispar-backend /etc/nginx/sites-enabled/

# Eliminar configuración por defecto
sudo rm /etc/nginx/sites-enabled/default

# Probar configuración
sudo nginx -t

# Si está OK, recargar Nginx
sudo systemctl reload nginx
```

---

## 🔒 Paso 7: Configurar Firewall (UFW)

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar reglas
sudo ufw status

# Resultado esperado:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

**⚠️ IMPORTANTE:** NO abrir el puerto 5000 en el firewall. Gunicorn solo debe ser accesible desde Nginx (localhost).

---

## 🔐 Paso 8: Configurar SSL/HTTPS con Let's Encrypt

### 8.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtener Certificado SSL
```bash
# Si tienes un dominio (ejemplo: backend.chrispar.com)
sudo certbot --nginx -d backend.chrispar.com

# Certbot automáticamente:
# 1. Obtiene el certificado
# 2. Configura Nginx para HTTPS
# 3. Redirige HTTP a HTTPS
```

### 8.3 Renovación Automática
```bash
# Probar renovación
sudo certbot renew --dry-run

# Certbot crea un cron job automático para renovar
# Verificar: sudo systemctl list-timers | grep certbot
```

---

## 🧪 Paso 9: Probar el Despliegue

### 9.1 Verificar Servicios
```bash
# Estado del backend
sudo systemctl status chrispar-backend

# Estado de Nginx
sudo systemctl status nginx

# Ver logs del backend
sudo journalctl -u chrispar-backend -n 50

# Ver logs de Nginx
sudo tail -f /var/log/nginx/chrispar_error.log
```

### 9.2 Probar desde el Navegador
```
http://TU_IP_VM/
# o si configuraste SSL:
https://TU_DOMINIO/
```

### 9.3 Probar Endpoints Específicos
```bash
# Desde tu máquina Windows
curl http://TU_IP_VM/health
curl http://TU_IP_VM/api/usuarios
```

---

## 🔄 Paso 10: Actualización del Código (Deploy Manual)

### 10.1 Script de Actualización
```bash
# Crear script de deploy
nano /var/www/chrispar_backend/backend/deploy.sh
```

Contenido:
```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# Navegar al directorio
cd /var/www/chrispar_backend

# Pull del código
echo "📦 Descargando código..."
git pull origin main

# Activar entorno virtual
cd backend
source venv/bin/activate

# Instalar dependencias
echo "📦 Instalando dependencias..."
pip install -r requirements.txt

# Ejecutar migraciones
echo "🗃️ Ejecutando migraciones..."
flask db upgrade

# Reiniciar servicio
echo "🔄 Reiniciando servicio..."
sudo systemctl restart chrispar-backend

echo "✅ Deploy completado!"
```

```bash
# Hacer ejecutable
chmod +x /var/www/chrispar_backend/backend/deploy.sh

# Permitir restart sin password
sudo visudo
# Añadir línea:
# TU_USUARIO ALL=(ALL) NOPASSWD: /bin/systemctl restart chrispar-backend
```

### 10.2 Ejecutar Deploy
```bash
/var/www/chrispar_backend/backend/deploy.sh
```

---

## 📊 Paso 11: Monitoreo y Mantenimiento

### 11.1 Verificar Logs
```bash
# Logs del backend
sudo journalctl -u chrispar-backend -f

# Logs de Nginx
sudo tail -f /var/log/nginx/chrispar_access.log
sudo tail -f /var/log/nginx/chrispar_error.log

# Logs de Gunicorn
sudo tail -f /var/log/chrispar/error.log
```

### 11.2 Comandos Útiles
```bash
# Reiniciar backend
sudo systemctl restart chrispar-backend

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver estado de servicios
sudo systemctl status chrispar-backend
sudo systemctl status nginx

# Ver uso de recursos
htop
df -h
free -h
```

---

## 🆘 Solución de Problemas

### Problema 1: Backend no inicia
```bash
# Ver logs detallados
sudo journalctl -u chrispar-backend -xe

# Verificar permisos
ls -la /var/www/chrispar_backend/backend

# Probar manualmente
cd /var/www/chrispar_backend/backend
source venv/bin/activate
gunicorn -c gunicorn_config.py "app:create_app()"
```

### Problema 2: Nginx muestra 502 Bad Gateway
```bash
# Verificar que Gunicorn esté corriendo
sudo systemctl status chrispar-backend

# Verificar conectividad
curl http://127.0.0.1:5000

# Ver logs de Nginx
sudo tail -f /var/log/nginx/chrispar_error.log
```

### Problema 3: No puede conectar a la Base de Datos
```bash
# Verificar conectividad desde Ubuntu
psql -h IP_BD -U postgres -d chrispar -p 5434

# Verificar firewall en el servidor de BD
# Asegúrate de que el puerto 5434 esté abierto para la IP de Ubuntu
```

### Problema 4: CORS Errors
Verificar que en [config.py](c:\Users\josue\OneDrive\Documentos\Universidad\6to semestre\Aplicaciones web II\Proyecto de semestre\chrispar_HHRR\backend\config.py) o [app.py](c:\Users\josue\OneDrive\Documentos\Universidad\6to semestre\Aplicaciones web II\Proyecto de semestre\chrispar_HHRR\backend\app.py) esté configurado CORS correctamente:
```python
CORS(app, resources={r"/*": {"origins": ["http://tu-frontend.com", "https://tu-frontend.com"]}})
```

---

## 📝 Checklist de Producción

- [ ] Ubuntu Server instalado y actualizado
- [ ] Python 3.11+ instalado
- [ ] Repositorio clonado en `/var/www/chrispar_backend`
- [ ] Entorno virtual creado y dependencias instaladas
- [ ] Archivo `.env` configurado con credenciales de producción
- [ ] `FLASK_DEBUG=0` y `FLASK_ENV=production`
- [ ] Gunicorn configurado y probado
- [ ] Servicio systemd creado y habilitado
- [ ] Nginx instalado y configurado
- [ ] Firewall (UFW) configurado correctamente
- [ ] SSL/HTTPS configurado (si tienes dominio)
- [ ] Backend accesible desde navegador
- [ ] Logs funcionando correctamente
- [ ] Script de deploy creado

---

## 🔗 Próximos Pasos

1. **Frontend en la Nube**: Despliega el frontend en Render/Vercel
2. **CI/CD**: Configura GitHub Actions para deploy automático
3. **Monitoring**: Instala herramientas de monitoreo (Prometheus, Grafana)
4. **Backups**: Configura backups automáticos de la base de datos

---

## 📚 Referencias

- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/2.3.x/deploying/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
