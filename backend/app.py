from flask import Flask
from flask_cors import CORS
from extensions import db, migrate
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")
    
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Importar modelos para que las migraciones los detecten
    with app.app_context():
        from models import Empleado, Cargo, Usuario, LogTransaccional, Asistencia, Permiso
    
    # Registrar blueprints
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
    
    # Imprimir rutas registradas para debug
    print("\n=== RUTAS REGISTRADAS ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.methods} {rule.rule}")
    print("========================\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)