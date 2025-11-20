import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from config import Config
from extensions import db
from models.usuario import Usuario


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:")
    app = create_app()
    app.config.update(
        TESTING=True,
        SECRET_KEY="test-secret",
    )

    with app.app_context():
        db.create_all()
        usuario = Usuario(
            username="admin",
            password=generate_password_hash("secret123"),
            rol="administrador",
        )
        db.session.add(usuario)
        db.session.commit()

    yield app

    with app.app_context():
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def test_login_returns_token(client):
    response = client.post(
        "/api/usuarios/login",
        json={"username": "admin", "password": "secret123"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "token" in data
    assert data["usuario"]["username"] == "admin"
    assert data["usuario"]["rol"] == "administrador"


def test_login_rejects_invalid_password(client):
    response = client.post(
        "/api/usuarios/login",
        json={"username": "admin", "password": "wrong"},
    )

    assert response.status_code == 401
    data = response.get_json()
    assert data["error"] == "Credenciales inválidas"
