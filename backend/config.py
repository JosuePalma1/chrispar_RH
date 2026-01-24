# configuración de los parámetros esenciales para una aplicación que usa SQLAlchemy 
# establece configuraciones predeterminadas si no se encuentran las variables de entorno necesarias

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Cargar variables de entorno desde backend/.env, sin depender del CWD.
# override=True para que el .env del proyecto tenga prioridad en desarrollo.
load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)

class Config:
    # Base de datos principal
    # - En desarrollo local (Postgres instalado o contenedor con puerto 5432 expuesto): localhost
    # - Si el backend corre dentro de Docker: usar el nombre del servicio (postgres_primary)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL no está definida")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "devkey")

    # Mirror DB config:
    # - SQLite: uses ATTACH DATABASE to a file path and triggers write into schema 'mirror'.
    # - PostgreSQL: supports two modes:
    #   - schema mode: mirrors into another schema within the same DB (MIRROR_SCHEMA)
    #   - external mode: mirror is another DB (e.g., another container) used for read-only inspection
    MIRROR_SCHEMA = os.getenv("MIRROR_SCHEMA", "mirror")
    MIRROR_DB_PATH = os.getenv("MIRROR_DB_PATH", str(BASE_DIR / "database_mirror.db"))
    # Mirror DB:
    # - Si MIRROR_DATABASE_URL está definido => modo externo (Docker/otra instancia)
    # - Si NO está definido => modo schema (triggers hacia el schema "mirror")
    MIRROR_DATABASE_URL = os.getenv("MIRROR_DATABASE_URL")  # None si no está definida

    # SQLite only: if enabled (or mirror file exists), the app will ATTACH the mirror DB for each connection.
    MIRROR_DB_ENABLED = os.getenv("MIRROR_DB_ENABLED", "0") == "1"

    #Server de archivos
    FILE_SERVER_URL = os.getenv('FILE_SERVER_URL')
