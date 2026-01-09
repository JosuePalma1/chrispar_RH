from flask import Flask, g
from flask_cors import CORS
from extensions import db, migrate, db_failover
from sqlalchemy.exc import OperationalError
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")
    
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Inicializar failover automático
    db_failover.init_app(app)
    
    # Hook para intentar reconectar al primary en cada request
    @app.before_request
    def check_database_connection():
        """Verifica la conexión a la BD antes de cada request."""
        try:
            # Si estamos usando mirror, intentar volver al primary
            if db_failover.using_mirror:
                db_failover.try_reconnect_primary()
            
            # Verificar que la conexión actual funcione
            db.session.execute(db.text("SELECT 1"))
            
        except OperationalError as e:
            # Si falla, el event handler de extensions.py hará el failover automáticamente
            app.logger.error(f"Error de conexión a BD: {e}")
            # Intentar de nuevo con mirror
            try:
                db.session.execute(db.text("SELECT 1"))
            except Exception as retry_error:
                app.logger.error(f"Error incluso después de failover: {retry_error}")
    
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
    
    # Imprimir configuración de failover
    print("\n=== CONFIGURACIÓN DE FAILOVER ===")
    print(f"Primary DB: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
    print(f"Mirror DB:  {app.config.get('MIRROR_DATABASE_URL', 'No configurado')}")
    if app.config.get('MIRROR_DATABASE_URL'):
        print("✓ Failover automático habilitado")
        print("  - Se ejecuta automáticamente cuando el primary falla")
        print("  - No requiere health checker en background")
        print("  - Failback automático cuando el primary se recupera")
    print("================================\n")
    
    # Imprimir rutas registradas para debug
    print("=== RUTAS REGISTRADAS ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.methods} {rule.rule}")
    print("========================\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)