from flask import Flask, g
from flask_cors import CORS
from extensions import db, migrate, db_failover
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")
    
    # NO persistir el estado de failover entre reinicios
    # El backend SIEMPRE inicia con el Primary configurado en .env
    # El failover solo ocurre durante la ejecución si el Primary falla
    
    # Verificar conexión inmediatamente al iniciar ANTES de inicializar SQLAlchemy
    try:
        from sqlalchemy import create_engine
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        c_args = {"connect_timeout": 5} if db_uri and "postgresql" in db_uri else {}
        test_engine = create_engine(db_uri, connect_args=c_args)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        test_engine.dispose()
        app.logger.info("✅ Conexión inicial exitosa al Primary")
    except OperationalError as e:
        app.logger.warning(f"⚠️  Primary no disponible al iniciar: {str(e)[:100]}")
        # Cambiar la URL ANTES de inicializar SQLAlchemy
        mirror_url = app.config.get('MIRROR_DATABASE_URL')
        if mirror_url:
            app.logger.warning("🔄 Cambiando al Mirror automáticamente...")
            app.config['SQLALCHEMY_DATABASE_URI'] = mirror_url
            # Verificar que el Mirror funciona
            try:
                c_args_mirror = {"connect_timeout": 5} if mirror_url and "postgresql" in mirror_url else {}
                test_engine = create_engine(mirror_url, connect_args=c_args_mirror)
                with test_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                test_engine.dispose()
                app.logger.info("✅ Conexión exitosa al Mirror")
            except Exception as mirror_error:
                app.logger.error(f"❌ Mirror tampoco disponible: {mirror_error}")
                raise
        else:
            app.logger.error("❌ No hay Mirror configurado - el sistema no funcionará")
            raise
    
    # Inicializar failover automático PRIMERO (necesita saber si ya usamos mirror)
    db_failover.init_app(app)
    
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Hook para intentar reconectar al primary en cada request
    @app.before_request
    def check_database_connection():
        """Verifica la conexión a la BD antes de cada request."""
        # Si ya activamos failover, skip check del primary (evitar loops)
        if db_failover.using_mirror:
            # Opcional: intentar volver al primary cada cierto tiempo
            # db_failover.try_reconnect_primary()
            return
        
        # Verificar conexión al primary
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("SELECT 1"))
                
        except OperationalError as e:
            app.logger.error(f"💥 Error de conexión a primary: {str(e)[:100]}")
            
            # Ejecutar failover automático al mirror
            if db_failover.mirror_url:
                app.logger.warning("🔄 Activando failover automático...")
                db_failover._switch_to_mirror()
                app.logger.info("✅ Failover activado - requests subsiguientes usarán mirror")
            else:
                app.logger.error("❌ No hay mirror configurado")
                db.session.rollback()
                raise
    
    # Importar modelos para que las migraciones los detecten
    with app.app_context():
        from models import Empleado, Cargo, Usuario, LogTransaccional, Asistencia, Permiso
    
    # Registrar blueprints (incluye health_bp)
    from routes import all_blueprints
    for blueprint in all_blueprints:
        app.register_blueprint(blueprint)
    
    # Auto-setup mirror if enabled
    with app.app_context():
        _setup_mirror_auto(app)
    
    return app


def _setup_mirror_auto(app):
    """Configure mirror DB triggers automatically on startup."""
    try:
        database_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        mirror_database_url = app.config.get('MIRROR_DATABASE_URL')
        mirror_schema = app.config.get('MIRROR_SCHEMA', 'mirror')
        mirror_path = app.config.get('MIRROR_DB_PATH')
        mirror_enabled = bool(app.config.get('MIRROR_DB_ENABLED')) or (
            mirror_path and os.path.exists(mirror_path)
        )
        
        dialect = db.engine.dialect.name
        
        # Skip if external mirror (needs manual replication setup)
        if dialect.startswith('postgres') and mirror_database_url:
            print("[Mirror] Modo externo detectado (MIRROR_DATABASE_URL). Replicación manual requerida.")
            return
        
        # SQLite: attach mirror DB
        if dialect == 'sqlite' and mirror_enabled and mirror_path:
            from sqlalchemy import event
            from utils.mirror_db import attach_mirror_if_needed
            
            @event.listens_for(db.engine, 'connect')
            def _attach_mirror(dbapi_connection, connection_record):
                try:
                    cursor = dbapi_connection.cursor()
                    cursor.execute('PRAGMA database_list;')
                    attached = any(row[1] == mirror_schema for row in cursor.fetchall())
                    if not attached:
                        mirror_path_sql = mirror_path.replace("'", "''")
                        cursor.execute(f"ATTACH DATABASE '{mirror_path_sql}' AS {mirror_schema};")
                    cursor.close()
                except Exception:
                    pass
            
            print(f"[Mirror] SQLite: adjuntando {mirror_path} como schema '{mirror_schema}'")
        
        # PostgreSQL schema mode: auto-create triggers if not exist
        if dialect.startswith('postgres') and not mirror_database_url:
            from utils.mirror_db import auto_setup_postgres_schema_mirror
            result = auto_setup_postgres_schema_mirror(db.engine, mirror_schema)
            if result:
                print(f"[Mirror] PostgreSQL schema '{mirror_schema}': {len(result.get('tables_created', []))} tablas, {len(result.get('triggers_created', []))} triggers creados")
            else:
                print(f"[Mirror] PostgreSQL schema '{mirror_schema}': OK (ya configurado)")
    
    except Exception as e:
        print(f"[Mirror] Error en auto-setup: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    app = create_app()
    
    # Solo mostrar info en el proceso del reloader (evita duplicados)
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        # Contar rutas registradas
        total_rutas = len(list(app.url_map.iter_rules()))
        
        # Imprimir configuración resumida
        print("\n✅ Backend iniciado correctamente")
        print(f"   Primary DB: localhost:5432/chrispar")
        mirror_status = "✓ Habilitado" if app.config.get('MIRROR_DATABASE_URL') else "○ Schema mirror (no failover externo)"
        print(f"   Mirror:     {mirror_status}")
        print(f"   Rutas:      {total_rutas} endpoints registrados")
        print(f"   API:        http://127.0.0.1:5000\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)