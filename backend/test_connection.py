#!/usr/bin/env python
"""Script para probar la conexión a la base de datos."""
from app import create_app
from extensions import db

def test_connection():
    app = create_app()
    with app.app_context():
        try:
            # Ejecutar una consulta simple
            result = db.session.execute(db.text('SELECT COUNT(*) FROM usuarios'))
            count = result.scalar()
            print(f'✅ Conexión exitosa a la base de datos')
            print(f'📊 Total de usuarios: {count}')
            
            # Obtener la URL de conexión actual
            db_url = db.engine.url
            print(f'🔗 Conectado a: {db_url.host}:{db_url.port}/{db_url.database}')
            
            return True
        except Exception as e:
            print(f'❌ Error de conexión: {str(e)}')
            return False

if __name__ == '__main__':
    test_connection()
