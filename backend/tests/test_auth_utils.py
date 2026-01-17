"""
Tests unitarios para utils/auth.py
"""
import pytest
from datetime import datetime, timedelta
from utils.auth import generate_token


class TestGenerateToken:
    """Tests para la función generate_token"""
    
    def test_generate_token_creates_valid_jwt(self, app):
        """Debe generar un JWT válido con los claims esperados"""
        with app.app_context():
            token = generate_token(user_id=1, username="test_user", rol="admin")
            
            assert token is not None
            assert isinstance(token, str)
            assert len(token) > 50  # JWT típico tiene más de 50 caracteres
    
    def test_token_contains_expected_payload(self, app):
        """El token debe contener user_id, username y rol"""
        import jwt
        
        with app.app_context():
            token = generate_token(user_id=42, username="john_doe", rol="supervisor")
            
            decoded = jwt.decode(
                token,
                app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            assert decoded['user_id'] == 42
            assert decoded['username'] == "john_doe"
            assert decoded['rol'] == "supervisor"
            assert 'exp' in decoded  # Expiration claim
            assert 'iat' in decoded  # Issued at claim
    
    def test_token_expiration_is_set(self, app):
        """El token debe tener un tiempo de expiración configurado"""
        import jwt
        
        with app.app_context():
            before = datetime.utcnow()
            token = generate_token(user_id=1, username="test", rol="admin")
            after = datetime.utcnow()
            
            decoded = jwt.decode(
                token,
                app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            exp_timestamp = decoded['exp']
            exp_datetime = datetime.utcfromtimestamp(exp_timestamp)
            
            # El token debería expirar en el futuro (más de 1 hora)
            assert exp_datetime > after + timedelta(hours=1)
            # Pero no más de 12 horas (límite razonable según tu config)
            assert exp_datetime < after + timedelta(hours=12)


@pytest.fixture
def app():
    """Fixture para crear una aplicación Flask de prueba"""
    from app import create_app
    from config import Config
    
    class TestConfig(Config):
        TESTING = True
        SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
        SECRET_KEY = 'test-secret-key-for-unit-tests'
        JWT_SECRET_KEY = 'test-jwt-secret-key'
    
    # Pasar la configuración de prueba a create_app para que se use
    # antes de que la app intente conectarse a la base de datos.
    app = create_app(TestConfig)
    
    return app
