from app import create_app
from extensions import db
from models.usuario import Usuario
from models.cargo import Cargo
from werkzeug.security import generate_password_hash
import json

app = create_app()

with app.app_context():
    print("=" * 50)
    print("INICIALIZANDO BASE DE DATOS")
    print("=" * 50)
    
    # Verificar si ya existe el cargo de Administrador
    cargo_admin = Cargo.query.filter_by(nombre_cargo='Administrador').first()
    if not cargo_admin:
        cargo_admin = Cargo(
            nombre_cargo='Administrador',
            sueldo_base=1500.00,
            permisos=json.dumps(['dashboard', 'cargos', 'usuarios', 'empleados', 'hojas-vida', 'asistencias', 'horarios', 'permisos', 'nomina', 'rubros', 'logs']),
            creado_por=1
        )
        db.session.add(cargo_admin)
        db.session.commit()
        print("✓ Cargo 'Administrador' creado exitosamente")
    else:
        print("✓ Cargo 'Administrador' ya existe")
    
    # Verificar si ya existe el usuario admin
    admin_existente = Usuario.query.filter_by(username='admin').first()
    
    if not admin_existente:
        admin = Usuario(
            username='admin',
            password=generate_password_hash('123'),
            rol='Administrador'
        )
        db.session.add(admin)
        db.session.commit()
        print("✓ Usuario 'admin' creado exitosamente")
    else:
        print("✓ Usuario 'admin' ya existe")
    
    print("\n" + "=" * 50)
    print("CREDENCIALES DE ACCESO AL SISTEMA")
    print("=" * 50)
    print("Usuario:    admin")
    print("Contraseña: 123")
    print("=" * 50)
    print("\nPuedes acceder al sistema en: http://localhost:3000")
    print("El administrador tiene acceso a todos los módulos.")
