from app import create_app
from extensions import db
from models.usuario import Usuario

app = create_app()
with app.app_context():
    u = Usuario.query.filter_by(username='admin').first()
    if not u:
        print('Usuario admin no encontrado')
    else:
        print('username:', u.username)
        print('password hash:', u.password)
