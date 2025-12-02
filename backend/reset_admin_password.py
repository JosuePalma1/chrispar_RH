from app import create_app
from extensions import db
from werkzeug.security import generate_password_hash
from models.usuario import Usuario

app = create_app()
with app.app_context():
    admin = Usuario.query.filter_by(username='admin').first()
    if not admin:
        print("admin no encontrado")
    else:
        admin.password = generate_password_hash('123')
        db.session.commit()
        print("Contraseña de admin reseteada a '123'")
