# Microservicio de Archivos (Docker)

## Requisitos
- Tener Docker Desktop instalado y corriendo.

## Cómo iniciar
1. Abre esta carpeta en la terminal.
2. Ejecuta: `docker-compose up --build`
3. El servidor estará listo en: `http://localhost:5000`
4. Ejecuta el proyecto, ve a Hoja de vida y sube un archivo al crear una hoja de vida

## Rutas
- POST /upload (key: 'file')
- GET /files/<nombre_archivo>