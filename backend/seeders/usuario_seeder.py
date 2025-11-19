from seeders.base_seeder import Seeder, app
from extensions import db
from models.usuario import Usuario
from werkzeug.security import generate_password_hash

class UsuarioSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Usuarios...")
            
            usuarios = [
                Usuario(
                    username='admin',
                    password=generate_password_hash('123'),
                    rol='admin'
                ),
                Usuario(
                    username='supervisor',
                    password=generate_password_hash('123'),
                    rol='supervisor'
                ),
                Usuario(
                    username='empleado1',
                    password=generate_password_hash('123'),
                    rol='empleado'
                )
            ]
            
            for usuario in usuarios:
                existing = Usuario.query.filter_by(username=usuario.username).first()
                if not existing:
                    db.session.add(usuario)
                    print(f"  Usuario '{usuario.username}' creado")
                else:
                    print(f"  Usuario '{usuario.username}' ya existe")
            
            db.session.commit()
            print(f"Usuarios: {Usuario.query.count()} registros\n")
