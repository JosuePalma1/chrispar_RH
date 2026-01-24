from flask import Flask
from flask_cors import CORS
from extensions import db, migrate, db_failover
from sqlalchemy.exc import OperationalError
from sqlalchemy import text, create_engine
import os
import sys

FAILOVER_STATE_FILE = "/tmp/failover_state.txt"

def create_app(config_object=None):
    app = Flask(__name__)
    
    # =========================================================
    # 1️⃣ Configuración de CORS
    # =========================================================
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    # =========================================================
    # 2️⃣ Configuración principal
    # =========================================================
    app.config.from_object("config.Config")

    # Permitir override opcional (tests / CI)
    if config_object:
        if isinstance(config_object, dict):
            app.config.update(config_object)
        else:
            app.config.from_object(config_object)

    # =========================================================
    # 3️⃣ Restaurar failover persistente
    # =========================================================
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

    # =========================================================
    # 4️⃣ Verificar conexión ANTES de inicializar SQLAlchemy
    # =========================================================
    def test_connection(db_url, label):
        c_args = {"connect_timeout": 5} if "postgresql" in db_url else {}
        engine = create_engine(db_url, connect_args=c_args)
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
            app.logger.critical("❌ No hay Mirror configurado")
            raise
        app.logger.warning("🔄 Cambiando a MIRROR automáticamente")
        app.config["SQLALCHEMY_DATABASE_URI"] = mirror_url
        test_connection(mirror_url, "MIRROR")
        try:
            with open(FAILOVER_STATE_FILE, "w") as f:
                f.write("mirror")
        except Exception:
            pass

    # =========================================================
    # 5️⃣ Inicialización de extensiones
    # =========================================================
    db_failover.init_app(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # =========================================================
    # 6️⃣ Health check por cada request
    # =========================================================
    @app.before_request
    def check_database_connection():
        if db_failover.using_mirror:
            return
        try:
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except OperationalError:
            app.logger.error("💥 Primary caído durante ejecución")
            if db_failover.mirror_url:
                app.logger.warning("🔄 Activando failover automático")
                db_failover._switch_to_mirror()
                try:
                    with open(FAILOVER_STATE_FILE, "w") as f:
                        f.write("mirror")
                except Exception:
                    pass
            else:
                db.session.rollback()
                raise

    # =========================================================
    # 7️⃣ Registro de Blueprints
    # =========================================================
    from routes import all_blueprints
    for bp in all_blueprints:
        app.register_blueprint(bp)

    # =========================================================
    # 8️⃣ Setup mirror automático
    # =========================================================
    with app.app_context():
        _setup_mirror_auto(app)

    return app

def _setup_mirror_auto(app):
    try:
        mirror_url = app.config.get("MIRROR_DATABASE_URL")
        mirror_schema = app.config.get("MIRROR_SCHEMA", "mirror")
        dialect = db.engine.dialect.name

        if dialect.startswith("postgres") and mirror_url:
            print("[Mirror] Mirror externo detectado. Replicación gestionada externamente.")
            return

        if dialect.startswith("postgres"):
            from utils.mirror_db import auto_setup_postgres_schema_mirror
            auto_setup_postgres_schema_mirror(db.engine, mirror_schema)
            print(f"[Mirror] PostgreSQL schema '{mirror_schema}' listo")
    except Exception as e:
        print(f"[Mirror] Error en auto-setup: {e}")

# =========================================================
# 9️⃣ Inicialización de DB y Seeders (RUN_DB_INIT=1)
# =========================================================
if os.environ.get("RUN_DB_INIT", "0") == "1":
    print("🚀 Inicializando base de datos y seeders...")
    from extensions import db
    from inicializar_db import crear_admin
    from database_seeder import seed_data

    app = create_app()
    with app.app_context():
        db.create_all()
        print("✅ Tablas creadas")
        crear_admin()
        print("✅ Admin creado")
        seed_data()
        print("✅ Seeders ejecutados")

    print("🎉 Inicialización completada")
    sys.exit(0)  # Terminar proceso para Render

# =========================================================
# 10️⃣ Arranque normal
# =========================================================
if __name__ == "__main__":
    app = create_app()
    print("\n🚀 PRODUCCIÓN INICIADA EN PUERTO 5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
