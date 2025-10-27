from flask import Flask
from flask_cors import CORS
from extensions import db, migrate

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    # Registrar blueprints DENTRO del contexto de la app
    with app.app_context():
        # Importar modelos
        from models import Empleado, Cargo, Usuario
        
        # Registrar blueprints
        from routes import all_blueprints
        
        for bp in all_blueprints:
            app.register_blueprint(bp)
    
    # Imprimir las rutas registradas
    print("Rutas registradas:")
    for rule in app.url_map.iter_rules():
        print(rule)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
