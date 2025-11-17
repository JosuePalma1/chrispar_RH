# � Configuración de Variables de Entorno

## � Credenciales por defecto

**PostgreSQL:**
- Usuario: `postgres`
- Contraseña: `123`
- Base de datos: `chrispar`

## ⚙️ ¿Necesitas cambiar las credenciales?

Si tu contraseña de PostgreSQL es diferente o quieres usar otras credenciales:

1. Edita el archivo `backend/.env`
2. Cambia la línea:
   ```
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/chrispar
   ```
3. Reinicia el servidor backend

**Ejemplo:** Si tu contraseña es `admin123`:
```
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/chrispar
```

---

💡 **Tip:** Recuerda la contraseña que pusiste al instalar PostgreSQL.
