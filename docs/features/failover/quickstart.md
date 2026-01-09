# 🚀 Guía Rápida de Failover - Chrispar HHRR

## ¿Qué es el Failover Automático?

Sistema que **detecta automáticamente cuando la base de datos principal falla** y cambia al mirror (espejo) **en el momento que se intenta usar**, sin necesidad de procesos en background.

### 🎯 Características:
- ✅ **Failover on-demand**: Se ejecuta cuando se intenta conectar (login, consultas, etc.)
- ✅ **Sin overhead**: No hay procesos verificando constantemente  
- ✅ **Automático**: No requiere intervención manual
- ✅ **Failback inteligente**: Vuelve al primary cuando se recupera

## 🎯 Comandos Esenciales

### Ver estado del sistema
```powershell
.\scripts\check_status.ps1
```

### Verificar qué BD está activa
```powershell
curl http://localhost:5000/api/health
# {"database": "primary", "status": "healthy"}
```

### Failover manual (opcional)
```powershell
# Cambiar al mirror manualmente
.\scripts\failover_to_mirror.ps1

# Volver al primary manualmente
.\scripts\failback_to_primary.ps1
```

## ⚙️ ¿Cómo funciona?

### Flujo Automático:

```
1. Usuario hace LOGIN
         ↓
2. Backend intenta conectar a PRIMARY
         ↓
    ¿PRIMARY responde?
         ↓
    SÍ → Usa PRIMARY ✓
         │
    NO → FAILOVER automático a MIRROR
         ↓
3. Usuario continúa trabajando normalmente
         ↓
4. En la siguiente request, intenta PRIMARY de nuevo
         ↓
    ¿PRIMARY recuperado?
         ↓
    SÍ → FAILBACK automático a PRIMARY ✓
         │
    NO → Continúa usando MIRROR
```

### Ejemplo Real:

```powershell
# ESCENARIO: Primary se cae inesperadamente

# 1. Primary está funcionando
curl http://localhost:5000/api/usuarios/login -X POST -H "Content-Type: application/json" -d '{"usuario":"admin","contraseña":"123"}'
# ✓ Login exitoso (usando PRIMARY)

# 2. Primary se cae
docker stop chrispar_postgres_primary

# 3. Usuario intenta hacer login nuevamente
curl http://localhost:5000/api/usuarios/login -X POST -H "Content-Type: application/json" -d '{"usuario":"admin","contraseña":"123"}'
# ✓ Login exitoso (FAILOVER automático a MIRROR)

# 4. Verificar estado
curl http://localhost:5000/api/health
# {"database": "mirror", "status": "healthy"}

# 5. Recuperar primary
docker start chrispar_postgres_primary

# 6. Siguiente request vuelve a PRIMARY automáticamente
curl http://localhost:5000/api/empleados -H "Authorization: Bearer TOKEN"
# ✓ Consulta exitosa (FAILBACK automático a PRIMARY)
```

## 🧪 Probar el Sistema

```powershell
# PRUEBA COMPLETA DE FAILOVER

# 1. Estado inicial
curl http://localhost:5000/api/health
# {"database": "primary", "status": "healthy"}

# 2. Hacer login (PRIMARY funciona)
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/usuarios/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"usuario":"admin","contraseña":"123"}'
Write-Host "✓ Login con PRIMARY exitoso"

# 3. Simular fallo del PRIMARY
docker stop chrispar_postgres_primary
Write-Host "PRIMARY detenido"

# 4. Intentar login de nuevo (FAILOVER automático)
$login2 = Invoke-RestMethod -Uri "http://localhost:5000/api/usuarios/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"usuario":"admin","contraseña":"123"}'
Write-Host "✓ Login con MIRROR exitoso (failover automático)"

# 5. Verificar que usa MIRROR
curl http://localhost:5000/api/health
# {"database": "mirror", "status": "healthy"}

# 6. Recuperar PRIMARY
docker start chrispar_postgres_primary
Start-Sleep -Seconds 10

# 7. Siguiente request vuelve a PRIMARY
curl http://localhost:5000/api/health
# El sistema intentará volver a PRIMARY automáticamente
```

## ⚙️ Configuración (backend/.env)

```env
# URLs de conexión
DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar

# NO SE NECESITAN más configuraciones
# El failover es automático sin configuración adicional
```

## 📊 Ventajas de este Enfoque

### ✅ Más Eficiente:
- No consume recursos con procesos en background
- No hace verificaciones innecesarias cada X segundos
- Solo actúa cuando realmente se necesita

### ✅ Más Simple:
- No requiere configuración de intervalos
- No requiere configuración de reintentos
- Funciona "out of the box"

### ✅ Más Rápido:
- Failover instantáneo cuando se detecta el fallo
- No espera 30-90 segundos para hacer failover
- Respuesta inmediata al usuario

### ✅ Más Confiable:
- Menos componentes = menos puntos de fallo
- Sin threads en background que puedan crashear
- Lógica simple y directa

## 🔍 Monitoreo

### Ver qué BD está activa
```powershell
curl http://localhost:5000/api/health
# {
#   "status": "healthy",
#   "database": "primary",  ← primary o mirror
#   "timestamp": "2026-01-08T10:30:00",
#   "connection": "active",
#   "failover_enabled": true
# }
```

### Ver logs de failover
```powershell
# Ver eventos de failover
docker logs chrispar_backend | Select-String "FAILOVER"

# Ver todos los logs recientes
docker logs chrispar_backend --tail 50
```

### Estado completo del sistema
```powershell
.\scripts\check_status.ps1
```

## 🆘 Problemas Comunes

### El sistema no hace failover

```powershell
# 1. Verificar que MIRROR_DATABASE_URL esté configurado
docker exec chrispar_backend env | Select-String "MIRROR"

# 2. Verificar que el mirror esté corriendo
docker ps | Select-String "postgres_mirror"

# 3. Ver logs de error
docker logs chrispar_backend --tail 50
```

### Quiero forzar el uso de MIRROR

```powershell
# Usar script manual
.\scripts\failover_to_mirror.ps1
```

### Quiero volver a PRIMARY

```powershell
# Usar script manual
.\scripts\failback_to_primary.ps1
```

## 📖 Más Información

- **Guía técnica completa**: [FAILOVER_GUIDE.md](FAILOVER_GUIDE.md)
- **Ejemplos prácticos**: [FAILOVER_EXAMPLES.md](FAILOVER_EXAMPLES.md)
- **Implementación**: [MIRROR_DB_IMPLEMENTATION.md](MIRROR_DB_IMPLEMENTATION.md)

## 🎓 Conclusión

El nuevo sistema de failover es:
- **Automático**: No requiere intervención
- **Eficiente**: No consume recursos innecesarios
- **Instantáneo**: Responde en el momento que se necesita
- **Simple**: Sin configuración compleja

**¡Solo asegúrate de que ambas BDs estén corriendo y el sistema se encarga del resto!**
