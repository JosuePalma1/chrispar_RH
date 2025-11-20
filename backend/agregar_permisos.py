from app import create_app
from extensions import db

app = create_app()

with app.app_context():
    # Agregar columna permisos si no existe
    try:
        db.session.execute(db.text("ALTER TABLE cargos ADD COLUMN permisos TEXT"))
        db.session.commit()
        print("✓ Columna 'permisos' agregada exitosamente a la tabla 'cargos'")
    except Exception as e:
        if "already exists" in str(e) or "duplicate column" in str(e).lower():
            print("✓ La columna 'permisos' ya existe")
        else:
            print(f"✗ Error al agregar columna: {e}")
        db.session.rollback()
