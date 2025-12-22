# configuración de los parámetros esenciales para una aplicación que usa SQLAlchemy 
# establece configuraciones predeterminadas si no se encuentran las variables de entorno necesarias

import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

class Config:
    # FORZAR Docker primary - ignorar variables de entorno temporalmente
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres:123@localhost:5432/chrispar"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "devkey")

    # Mirror DB config:
    # - SQLite: uses ATTACH DATABASE to a file path and triggers write into schema 'mirror'.
    # - PostgreSQL: supports two modes:
    #   - schema mode: mirrors into another schema within the same DB (MIRROR_SCHEMA)
    #   - external mode: mirror is another DB (e.g., another container) used for read-only inspection
    MIRROR_SCHEMA = os.getenv("MIRROR_SCHEMA", "mirror")
    MIRROR_DB_PATH = os.getenv("MIRROR_DB_PATH", str(BASE_DIR / "database_mirror.db"))
    # FORZAR Docker mirror - Comentado para habilitar modo schema automático
    # MIRROR_DATABASE_URL = "postgresql://postgres:123@localhost:5433/chrispar"
    MIRROR_DATABASE_URL = os.getenv("MIRROR_DATABASE_URL")  # None si no está definida

    # SQLite only: if enabled (or mirror file exists), the app will ATTACH the mirror DB for each connection.
    MIRROR_DB_ENABLED = os.getenv("MIRROR_DB_ENABLED", "0") == "1"
