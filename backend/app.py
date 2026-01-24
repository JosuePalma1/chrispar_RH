from flask import Flask
from flask_cors import CORS
from extensions import db, migrate, db_failover
from sqlalchemy.exc import OperationalError
from sqlalchemy import text, create_engine
import os

FAILOVER_STATE_FILE = "/tmp/failover_state.txt"

def create_app(config_object=None):
    app = Flask(__name__)
    
    # CORS
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    # Configuración principal
    app.config.from_object("config.Config")

    # Override opcional
    if config_object:
        if isinstance(config_object, dict):
            app.config.update(config_object)
        else:
            app.config.from_object(config_object)

    # Restaurar failover si existe
    if os.path.exists(FAILOVER_STATE_FILE):
        try:
            with open(FAILOVER_STATE_FILE, "r") as f:
                if f.read().strip() == "mirror":
                    mirror_url = app.config.get("MIRROR_DATABASE_URL")
                    if mirror_url:
                        app.config["SQLALCHEMY_DATABASE_URI"] = mirror_url
                        app.logger.warning("🔄 Arranque en MIRROR por estado persistente")
        except Exception:
            pass

    # Test conexión inicial
    def test_connection(db_url, label):
        engine = create_engine(db_url, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        app.logger.info(f"✅ Conexión exitosa a {label}")

    try:
        test_connection(app.config["SQLALCHEMY_DATABASE_URI"], "PRIMARY")
    except OperationalError as e:
        app.logger.warning(f"⚠️ Primary no disponible: {str(e)[:120]}")
        mirror_url = app.config.get("MIRROR_DATABASE_URL")
        if not mirror_url:
            raise RuntimeError("❌ No hay Mirror configurado")
        app.logger.warning("🔄 Cambiando a MIRROR automáticamente")
        app.config["SQLALCHEMY_DATABASE_URI"] = mirror_url
        test_connection(mirror_url, "MIRROR")
        with open(FAILOVER_STATE_FILE, "w") as f:
            f.write("mirror")

    # Inicialización de extensiones
    db_failover.init_app(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Health check por request
    @app.before_request
    def check_database_connection():
        if db_failover.using_mirror:
            return
        try:
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except OperationalError:
            if db_failover.mirror_url:
                db_failover._switch_to_mirror()
                with open(FAILOVER_STATE_FILE, "w") as f:
                    f.write("mirror")
            else:
                db.session.rollback()
                raise

    # Blueprints
    from routes import all_blueprints
    for bp in all_blueprints:
        app.register_blueprint(bp)

    # Setup mirror
    with app.app_context():
        _setup_mirror_auto(app)

    return app

def _setup_mirror_auto(app):
    try:
        mirror_url = app.config.get("MIRROR_DATABASE_URL")
        mirror_schema = app.config.get("MIRROR_SCHEMA", "mirror")
        if db.engine.dialect.name.startswith("postgres") and mirror_url:
            print("[Mirror] Mirror externo detectado.")
            return
        if db.engine.dialect.name.startswith("postgres"):
            from utils.mirror_db import auto_setup_postgres_schema_mirror
            auto_setup_postgres_schema_mirror(db.engine, mirror_schema)
            print(f"[Mirror] PostgreSQL schema '{mirror_schema}' listo")
    except Exception as e:
        print(f"[Mirror] Error en auto-setup: {e}")

if __name__ == "__main__":
    app = create_app()
    print("\n🚀 PRODUCCIÓN INICIADA EN PUERTO 5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
