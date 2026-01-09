# Failover Automático (Auto-Asistido)

## ✅ Estado: IMPLEMENTADO Y VALIDADO

**Última prueba exitosa:** 2026-01-09
- ✅ Detección automática de falla primaria
- ✅ Preparación automática del mirror (subscription disable, reset sequences)
- ✅ Persistencia de estado entre reinicios
- ✅ Aplicación correcta del mirror desde el inicio
- ✅ Login y operaciones exitosas después de failover
- ⏱️ **Tiempo total de recuperación:** ~15-20 segundos (reinicio de contenedor)

---

## 🔄 Cómo Funciona

El sistema implementa un **failover auto-asistido** que detecta automáticamente cuando el primary falla y prepara el mirror, pero **requiere un reinicio del contenedor** para aplicar el cambio completamente.

### Flujo del Failover

1. **Detección Automática**: El `before_request` detecta que postgres_primary no responde
2. **Preparación del Mirror**: 
   - Deshabilita la suscripción de replicación
   - Resetea las secuencias de las tablas
   - Marca el estado en `/tmp/failover_state.txt`
3. **Señal de Reinicio**: El sistema indica que se activó el failover
4. **Reinicio Manual del Contenedor**: Ejecutar `docker restart chrispar_backend`
5. **Aplicación del Failover**: Al reiniciar, lee el estado y usa el mirror

## ⚡ Uso Rápido

```bash
# Cuando el sistema detecte el fallo, aparecerá en logs:
# "✅ Failover activado - requests subsiguientes usarán mirror"

# Reiniciar el backend:
docker restart chrispar_backend

# Esperar 5 segundos y el sistema estará operando con mirror
```

## 🎯 Ventajas de Este Enfoque

✅ **Detección automática** del fallo  
✅ **Preparación automática** del mirror (secuencias, suscripción)  
✅ **Sin pérdida de datos** (mirror está sincronizado)  
✅ **Persistencia del estado** (sobrevive reinicios)  
✅ **Un solo comando** para activar (`docker restart`)

## 🔧 Limitación Técnica

Flask-SQLAlchemy mantiene un cache interno del engine de base de datos que no se puede refrescar en tiempo de ejecución sin reiniciar el proceso Python.

## 🚀 Failover Completamente Automático (Futuro)

Para failover 100% automático sin intervención, se puede implementar:

1. **Health Check Externo**: Monitoreo que reinicie el contenedor automáticamente
2. **Orquestador (Kubernetes)**: Pods que se reinician automáticamente ante fallos
3. **Watchdog Interno**: Proceso que mata y reinicia el Flask app

## 📝 Ejemplo Completo

```bash
# 1. Simular fallo del primary
docker stop chrispar_postgres_primary

# 2. Hacer un request (activará failover)
curl http://localhost:5000/api/usuarios/login -d '{"username":"admin","password":"123"}'
# Respuesta: Error (esperado - primer request falla)

# 3. Ver en logs que se activó
docker logs chrispar_backend | grep "Failover activado"

# 4. Reiniciar backend
docker restart chrispar_backend

# 5. Esperar 10 segundos
sleep 10

# 6. Hacer login de nuevo
curl http://localhost:5000/api/usuarios/login -d '{"username":"admin","password":"123"}'
# Respuesta: ✅ Token (funcionando con mirror)
```

## 🔙 Failback al Primary

Cuando el primary se recupere:

```bash
# 1. Iniciar el primary
docker start chrispar_postgres_primary

# 2. Eliminar estado de failover
docker exec chrispar_backend rm /tmp/failover_state.txt

# 3. Reiniciar backend
docker restart chrispar_backend

# Sistema volverá a usar primary automáticamente
```

## 💡 Resumen

Este es un **failover reactivo auto-asistido**:
- ✅ Detecta fallos automáticamente  
- ✅ Prepara el mirror automáticamente  
- ⚡ Requiere un reinicio simple del contenedor  
- 🎯 Solución práctica y confiable

**Tiempo total de recuperación**: ~15 segundos (preparación + reinicio)
