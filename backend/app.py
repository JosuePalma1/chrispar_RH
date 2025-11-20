from flask import Flask
from flask_cors import CORS
from extensions import db, migrate

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
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Imprimir rutas registradas para debug
    print("\n=== RUTAS REGISTRADAS ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.methods} {rule.rule}")
    print("========================\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)