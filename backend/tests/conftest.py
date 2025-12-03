"""
Fixtures compartidos para todos los tests
"""
import sys
import os

# Agregar el directorio backend al PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from flask import Flask
from flask_cors import CORS
from extensions import db, migrate
from models.usuario import Usuario
from models.cargo import Cargo
from werkzeug.security import generate_password_hash
import jwt


@pytest.fixture(scope='function')
def app():
    """
    Fixture para crear una app Flask de prueba con SQLite en memoria
    Este fixture se ejecuta para cada función de test
    """
    # Crear app directamente con configuración de test
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test-secret-key-12345'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-12345'
    
    # Inicializar extensiones
    db.init_app(app)
    CORS(app)
    
    # Registrar blueprints
    from routes import all_blueprints
    for blueprint in all_blueprints:
        app.register_blueprint(blueprint)
    
    # Crear tablas y datos de prueba
    with app.app_context():
        db.create_all()
        
        # Crear usuario admin para pruebas
        admin = Usuario(
            username='test_admin',
            password=generate_password_hash('password123'),
            rol='Administrador'
        )
        db.session.add(admin)
        db.session.commit()
    
    yield app
    
    # Limpieza después del test
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Cliente de prueba para hacer requests HTTP"""
    return app.test_client()


@pytest.fixture
def admin_token(app):
    """Token JWT de un usuario administrador"""
    with app.app_context():
        from utils.auth import generate_token
        admin = Usuario.query.filter_by(username='test_admin').first()
        token = generate_token(admin.id, admin.username, admin.rol)
        return token


@pytest.fixture
def auth_headers(admin_token):
    """Headers con autorización para requests autenticados"""
    return {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def cargo_fixture(app):
    """Fixture para crear un cargo de prueba"""
    with app.app_context():
        cargo = Cargo(
            nombre_cargo='Desarrollador Test',
            sueldo_base=1500.0,
            permisos='[]'
        )
        db.session.add(cargo)
        db.session.commit()
        cargo_id = cargo.id_cargo
    
    yield cargo_id
    
    # No es necesario limpiar porque drop_all() lo hace al final


@pytest.fixture
def empleado_fixture(app, cargo_fixture):
    """Fixture para crear un empleado de prueba"""
    from models.empleado import Empleado
    from datetime import date
    
    with app.app_context():
        empleado = Empleado(
            id_cargo=cargo_fixture,
            nombres='Juan Carlos',
            apellidos='Pérez López',
            cedula='0987654321',
            estado='activo',
            fecha_nacimiento=date(1990, 5, 15),
            fecha_ingreso=date(2020, 1, 10),
            tipo_cuenta_bancaria='Ahorros',
            numero_cuenta_bancaria='1234567890123'
        )
        db.session.add(empleado)
        db.session.commit()
        empleado_id = empleado.id  # Campo correcto es 'id', no 'id_empleado'
    
    yield empleado_id
    
    # No es necesario limpiar porque drop_all() lo hace al final
