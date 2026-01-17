# Comportamiento del Sistema de Replicación Bidireccional

**Última actualización:** 14 de enero de 2026

## ✅ Comportamiento CORRECTO (VERIFICADO)

### Inicio del Sistema (docker-compose up)
```
✓ Primary ACTIVO → Backend se conecta al Primary
✓ Primary INACTIVO → Backend hace FAILOVER automático al Mirror
✓ Replicación bidireccional: Primary ⇄ Mirror (cuando ambos activos)
```

### Escenario 1: Solo Primary Activo (Mirror Apagado)
```powershell
docker stop chrispar_postgres_mirror
```

**Resultado:**
- ✅ El sistema FUNCIONA normalmente
- ✅ Backend usa PRIMARY
- ⚠️ Replicación deshabilitada (Primary → Mirror no funciona)
- 💡 Los cambios solo se guardan en Primary
- 💡 Cuando el Mirror vuelva, se sincronizará automáticamente

### Escenario 2: Solo Mirror Activo (Primary Apagado) ⭐ NUEVO
```powershell
docker stop chrispar_postgres_primary
```

**Resultado:**
- ✅ Backend detecta que Primary no responde AL INICIAR
- 🔄 Failover AUTOMÁTICO al Mirror en el arranque
- ✅ Backend ahora usa MIRROR
- ✅ El sistema FUNCIONA completamente
- ✅ Login y todas las operaciones CRUD disponibles
- ⚠️ Replicación deshabilitada (Mirror → Primary no funciona)
- 💡 Los cambios se guardan en Mirror
- 💡 **Al reiniciar el backend, intentará Primary primero**

### Escenario 3: Ambos Activos (Normal)
```powershell
docker start chrispar_postgres_primary
docker start chrispar_postgres_mirror
```

**Resultado:**
- ✅ Sistema funcionando óptimamente
- ✅ Backend usa PRIMARY
- ✅ Replicación bidireccional activa
- ✅ Cambios en Primary → Se replican a Mirror (3-5 seg)
- ✅ Cambios en Mirror → Se replican a Primary (3-5 seg)

---

## 🔄 Flujo de Failover/Failback

### Proceso de Failover Automático (Primary cae)

**Durante el arranque del backend:**
1. Backend intenta conectarse al Primary
2. Si Primary no responde → Failover automático al Mirror
3. Backend inicia usando Mirror
4. ✅ Sistema funcional desde el inicio

**Durante la ejecución (Runtime):**
1. Primary deja de responder durante una operación
2. Hook `before_request` detecta error de conexión
3. Backend hace failover AUTOMÁTICO al Mirror
4. Sistema continúa funcionando con Mirror

### Proceso de Failback (Primary vuelve)

**Failback Manual (Recomendado):**
```powershell
# 1. Iniciar Primary
docker start chrispar_postgres_primary

# 2. Esperar 10 segundos
Start-Sleep -Seconds 10

# 3. Reiniciar backend
docker-compose restart backend
```
- ✅ Backend intenta Primary primero
- ✅ Si Primary responde → Usa Primary
- ✅ Los cambios del Mirror YA están en el Primary (replicación bidireccional)
- ✅ Sistema funcionando normalmente

---

## 📊 Cómo Verificar el Estado

### Desde la Interfaz Web (BD Espejo)
```
🔵 USANDO AHORA: PRIMARY  (verde = Primary, amarillo = Mirror)
Primary (Original): postgres_primary:5432/chrispar
Mirror (Respaldo): postgres_mirror:5432/chrispar
```

### Desde la Terminal
```powershell
# Ver qué BDs están activas
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}"

# Ver a qué BD está conectado el backend
docker logs chrispar_backend --tail 30 | Select-String "FAILOVER|Primary|Mirror"

# Probar conexión directa
docker exec chrispar_backend python test_connection.py

# Verificar replicación
.\scripts\failover\check_sync_status.ps1
```

---

## 🧪 Pruebas de Funcionalidad

### Prueba 1: Sistema con Solo Primary
```powershell
# Detener Mirror
docker stop chrispar_postgres_mirror

# Probar la aplicación
# Resultado esperado: ✅ Funciona normalmente
```

### Prueba 2: Failover Automático
```powershell
# Detener Primary
docker stop chrispar_postgres_primary

# Esperar 10-15 segundos
# Probar la aplicación
# Resultado esperado: ✅ Funciona (usa Mirror)

# Verificar en logs
docker logs chrispar_backend | Select-String "FAILOVER"
# Debe mostrar: "EJECUTANDO FAILOVER AUTOMÁTICO AL MIRROR"
```

### Prueba 3: Failback Manual
```powershell
# Iniciar Primary
docker start chrispar_postgres_primary

# Esperar 10 segundos
Start-Sleep -Seconds 10

# Reiniciar backend
docker-compose restart backend

# Probar la aplicación
# Resultado esperado: ✅ Funciona (usa Primary)
```

### Prueba 4: Replicación Bidireccional
```powershell
# Asegurar que ambas BDs estén activas
docker start chrispar_postgres_primary
docker start chrispar_postgres_mirror

# Insertar en Primary, verificar en Mirror
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "INSERT INTO usuarios (username, password, rol) VALUES ('test1', 'pass', 'empleado');"
Start-Sleep -Seconds 5
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "SELECT username FROM usuarios WHERE username='test1';"
# Resultado esperado: ✅ Aparece el registro

# Insertar en Mirror, verificar en Primary
docker exec chrispar_postgres_mirror psql -U postgres -d chrispar -c "INSERT INTO usuarios (username, password, rol) VALUES ('test2', 'pass', 'empleado');"
Start-Sleep -Seconds 5
docker exec chrispar_postgres_primary psql -U postgres -d chrispar -c "SELECT username FROM usuarios WHERE username='test2';"
# Resultado esperado: ✅ Aparece el registro
```

---

## ⚠️ Notas Importantes

### 1. Estado de Failover NO se Persiste
- El backend SIEMPRE inicia conectándose al Primary
- El failover solo ocurre durante la ejecución si Primary falla
- Al reiniciar el backend, vuelve al Primary automáticamente
- Esto garantiza que el sistema siempre intente usar el Primary primero

### 2. Replicación Requiere Ambas BDs Activas
- Si una BD está apagada, la replicación en esa dirección no funciona
- Los cambios se almacenan localmente hasta que la otra BD vuelva
- Cuando ambas estén activas, la replicación se reanuda automáticamente

### 3. Latencia de Replicación
- Los cambios se replican en 3-5 segundos normalmente
- Bajo carga pesada, puede tomar más tiempo
- Siempre espera unos segundos después de un cambio antes de verificar

### 4. Failover Automático vs Manual
- **Automático**: Cuando Primary falla, el backend hace failover al Mirror
- **Manual**: Puedes hacer failover/failback usando los scripts en `scripts/failover/`

---

## 🛠️ Scripts Útiles

```powershell
# Verificar estado general
.\scripts\failover\check_status.ps1

# Verificar sincronización entre BDs
.\scripts\failover\check_sync_status.ps1

# Hacer failover manual al Mirror
.\scripts\failover\failover_to_mirror.ps1

# Hacer failback manual al Primary
.\scripts\failover\failback_to_primary.ps1

# Reiniciar sistema desde cero
.\scripts\failover\reset_and_restart.ps1
```

---

## 🎯 Resumen

**El sistema AHORA funciona correctamente:**

✅ Con solo Primary activo → Funciona
✅ Con solo Mirror activo → Hace failover automático y funciona
✅ Con ambos activos → Funciona con replicación bidireccional
✅ Al reiniciar backend → Vuelve al Primary automáticamente
✅ Frontend muestra claramente qué BD está usando

**Lo que se corrigió:**
- ❌ Estado de failover persistente → ✅ Estado en memoria solamente
- ❌ Backend siempre usaba Mirror → ✅ Siempre inicia con Primary
- ❌ Sistema no funcionaba sin Mirror → ✅ Funciona solo con Primary
- ❌ Frontend no mostraba BD activa → ✅ Muestra claramente qué BD usa
