# 🛠️ Scripts - Chrispar HHRR

Colección de scripts organizados por funcionalidad.

## 📂 Estructura

### 🗄️ [database/](database/)
Scripts para gestión de base de datos:
- [`seed.py`](database/seed.py) - Poblar base de datos con datos de prueba
- [`init_admin.py`](database/init_admin.py) - Crear usuario administrador inicial
- [`reset_password.py`](database/reset_password.py) - Resetear contraseña de administrador
- [`check_mirror.py`](database/check_mirror.py) - Verificar estado del mirror

### 🔄 [failover/](failover/)
Scripts de alta disponibilidad:
- [`failover_to_mirror.ps1`](failover/failover_to_mirror.ps1) - Cambiar al mirror manualmente
- [`failback_to_primary.ps1`](failover/failback_to_primary.ps1) - Volver al primary
- [`reset_failover.ps1`](failover/reset_failover.ps1) - Resetear sistema de failover
- [`check_status.ps1`](failover/check_status.ps1) - Verificar estado del sistema

### 🔧 [maintenance/](maintenance/)
Scripts de mantenimiento:
- [`inspect_admin.py`](maintenance/inspect_admin.py) - Inspeccionar usuario admin
- [`query_admin_db.py`](maintenance/query_admin_db.py) - Consultas a la BD admin

### 🎭 [demo/](demo/)
Scripts de demostración:
- [`demo_espejo.ps1`](demo/demo_espejo.ps1) - Demo del sistema de espejo

## 🚀 Uso Rápido

### Inicializar Base de Datos
```powershell
# Crear admin
python scripts/database/init_admin.py

# Poblar con datos de prueba
python scripts/database/seed.py
```

### Gestión de Failover
```powershell
# Verificar estado
.\scripts\failover\check_status.ps1

# Failover manual
.\scripts\failover\failover_to_mirror.ps1

# Volver al primary
.\scripts\failover\failback_to_primary.ps1
```

### Mantenimiento
```powershell
# Resetear contraseña admin
python scripts/database/reset_password.py

# Inspeccionar admin
python scripts/database/inspect_admin.py
```

## 📝 Notas

- Scripts Python requieren entorno virtual activado
- Scripts PowerShell requieren permisos de ejecución
- Ver documentación específica en [`docs/`](../docs/)
