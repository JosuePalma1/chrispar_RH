# configuración de los parámetros esenciales para una aplicación que usa SQLAlchemy 
# establece configuraciones predeterminadas si no se encuentran las variables de entorno necesarias

import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///" + str(BASE_DIR / "database.db"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "devkey")
