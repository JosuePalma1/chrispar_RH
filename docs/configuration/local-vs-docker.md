# 🔧 Funcionamiento en Modo Local vs Docker

## ✅ El Sistema Funciona en AMBOS Modos

### 🏠 Modo Local (Sin Docker)

**Configuración** (`backend/.env`):
```env
# Solo primary, sin mirror
DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar
# MIRROR_DATABASE_URL no está configurado

# O con schema (replicación en misma BD)
DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar
MIRROR_SCHEMA=mirror
```

**Comportamiento:**
- ✅ La aplicación funciona normalmente
- ❌ Failover deshabilitado (no hay mirror externo)
- ✅ Si usas schema, tienes replicación de datos pero no alta disponibilidad
- 📝 Logs mostrarán: `"MIRROR_DATABASE_URL no configurado - failover automático deshabilitado"`

```
┌─────────────────────────────┐
│  PostgreSQL (localhost)     │
│                             │
│  ├── Schema: public         │  ← App usa esto
│  └── Schema: mirror         │  ← Solo backup de datos
│                             │
└─────────────────────────────┘

Si PostgreSQL cae → App cae (no hay alternativa)
```

### 🐳 Modo Docker (Con Containers)

**Configuración** (`backend/.env`):
```env
# Primary y Mirror separados
DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar
```

**Comportamiento:**
- ✅ La aplicación funciona normalmente
- ✅ Failover habilitado y automático
- ✅ Alta disponibilidad completa
- 📝 Logs mostrarán: `"✓ Failover automático habilitado"`

```
┌────────────────┐          ┌────────────────┐
│  Primary       │          │  Mirror        │
│  Container     │──repli──>│  Container     │
│  :5432         │          │  :5432         │
└────────────────┘          └────────────────┘
       ↓ Cae                        ↑
       ✗                     Failover aquí ✓
```

## 🎯 Detección Automática

El código ya detecta automáticamente el modo:

```python
# En extensions.py
def init_app(self, app):
    self.mirror_url = app.config.get('MIRROR_DATABASE_URL')
    
    if not self.mirror_url:
        # Modo Local → Sin failover
        logger.warning("Failover deshabilitado")
        return  # No configura hooks de failover
    
    # Modo Docker → Con failover
    logger.info("Failover habilitado")
    # Configura hooks de failover
```

## 📊 Comparación

| Característica | Modo Local | Modo Docker |
|---------------|------------|-------------|
| **Configuración** | Solo DATABASE_URL | DATABASE_URL + MIRROR_DATABASE_URL |
| **Failover** | ❌ Deshabilitado | ✅ Habilitado |
| **Alta disponibilidad** | ❌ No | ✅ Sí |
| **Complejidad** | ⭐ Simple | ⭐⭐ Media |
| **Uso** | Desarrollo | Producción |
| **Schema mirror** | ✅ Opcional | ✅ Opcional (replicación) |

## 🚀 Ejemplos de Uso

### Desarrollo Local (Sin Failover)

```powershell
# 1. Configurar .env
DATABASE_URL=postgresql://postgres:123@localhost:5432/chrispar

# 2. Iniciar app
python app.py

# Output:
# [Mirror] MIRROR_DATABASE_URL no configurado - failover automático deshabilitado
# ✓ App funcionando normalmente
```

### Producción Docker (Con Failover)

```powershell
# 1. Configurar .env
DATABASE_URL=postgresql://postgres:123@postgres_primary:5432/chrispar
MIRROR_DATABASE_URL=postgresql://postgres:123@postgres_mirror:5432/chrispar

# 2. Iniciar containers
docker-compose up -d

# Output:
# [Mirror] Modo externo detectado (MIRROR_DATABASE_URL)
# ✓ Failover automático habilitado
```

## 🧪 Probar Ambos Modos

### Modo Local

```powershell
# App funciona normalmente, sin failover
curl http://localhost:5000/api/health
# {
#   "status": "healthy",
#   "database": "primary",
#   "failover_enabled": false  ← Sin failover
# }
```

### Modo Docker

```powershell
# Con failover habilitado
curl http://localhost:5000/api/health
# {
#   "status": "healthy", 
#   "database": "primary",
#   "failover_enabled": true  ← Failover disponible
# }

# Probar failover
docker stop chrispar_postgres_primary

curl http://localhost:5000/api/usuarios/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","contraseña":"123"}'
# ✓ Login exitoso (failover automático)
```

## 🔑 Puntos Clave

1. **El código es inteligente**: Detecta automáticamente si hay mirror disponible

2. **Modo Local**: 
   - ✅ Funciona perfectamente sin failover
   - ✅ Ideal para desarrollo
   - ❌ Sin alta disponibilidad

3. **Modo Docker**:
   - ✅ Funciona con failover automático
   - ✅ Ideal para producción
   - ✅ Alta disponibilidad

4. **No necesitas cambiar código**: La misma aplicación funciona en ambos modos

## 💡 Recomendación

```
Desarrollo Local (tu máquina):
  → Usar modo local (sin Docker)
  → Sin failover (no es necesario)
  → Más simple y rápido

Producción / Demos:
  → Usar Docker
  → Con failover (alta disponibilidad)
  → Más robusto
```

**¡El sistema ya está preparado para ambos escenarios!** ✨
