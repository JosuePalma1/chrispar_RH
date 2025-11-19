from app import create_app
from extensions import db

app = create_app()

class Seeder:
    """Clase base para seeders"""
    
    @staticmethod
    def run():
        """Método que debe implementar cada seeder"""
        raise NotImplementedError("Debe implementar el método run()")
    
    @staticmethod
    def truncate(model):
        """Limpia una tabla"""
        with app.app_context():
            db.session.query(model).delete()
            db.session.commit()
