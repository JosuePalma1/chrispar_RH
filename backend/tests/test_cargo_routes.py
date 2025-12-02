"""
Tests de integración para endpoints CRUD de Cargos
Usa fixtures de conftest.py
"""
import json
from extensions import db
from models.cargo import Cargo


class TestCargoCRUD:
    """Tests de integración para /api/cargos/"""
    
    def test_crear_cargo_exitoso(self, client, auth_headers):
        """POST /api/cargos/ debe crear un cargo nuevo"""
        response = client.post(
            '/api/cargos/',
            json={
                'nombre_cargo': 'Gerente General',
                'sueldo_base': 2500.00,
                'permisos': ['dashboard', 'empleados', 'cargos']
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['mensaje'] == 'Cargo creado exitosamente'
        assert 'id' in data
        assert isinstance(data['id'], int)
    
    def test_crear_cargo_sin_nombre_falla(self, client, auth_headers):
        """POST sin nombre_cargo debe devolver 400"""
        response = client.post(
            '/api/cargos/',
            json={'sueldo_base': 1000},
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_listar_cargos_vacio(self, client, auth_headers):
        """GET /api/cargos/ debe devolver lista vacía inicialmente"""
        response = client.get('/api/cargos/', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_listar_cargos_con_datos(self, client, auth_headers, app):
        """GET /api/cargos/ debe devolver todos los cargos"""
        # Crear cargos de prueba
        with app.app_context():
            cargo1 = Cargo(nombre_cargo='Vendedor', sueldo_base=500, permisos='[]')
            cargo2 = Cargo(nombre_cargo='Cajero', sueldo_base=550, permisos='[]')
            db.session.add_all([cargo1, cargo2])
            db.session.commit()
        
        response = client.get('/api/cargos/', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        assert data[0]['nombre_cargo'] in ['Vendedor', 'Cajero']
    
    def test_obtener_cargo_por_id(self, client, auth_headers, app):
        """GET /api/cargos/<id> debe devolver el cargo específico"""
        # Crear cargo
        with app.app_context():
            cargo = Cargo(
                nombre_cargo='Contador',
                sueldo_base=1500,
                permisos=json.dumps(['dashboard', 'nominas'])
            )
            db.session.add(cargo)
            db.session.commit()
            cargo_id = cargo.id_cargo
        
        response = client.get(f'/api/cargos/{cargo_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['nombre_cargo'] == 'Contador'
        assert data['sueldo_base'] == 1500.0
        assert 'dashboard' in data['permisos']
    
    def test_obtener_cargo_inexistente(self, client, auth_headers):
        """GET /api/cargos/9999 debe devolver 404"""
        response = client.get('/api/cargos/9999', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_actualizar_cargo(self, client, auth_headers, app):
        """PUT /api/cargos/<id> debe actualizar el cargo"""
        # Crear cargo
        with app.app_context():
            cargo = Cargo(nombre_cargo='Supervisor', sueldo_base=1200, permisos='[]')
            db.session.add(cargo)
            db.session.commit()
            cargo_id = cargo.id_cargo
        
        response = client.put(
            f'/api/cargos/{cargo_id}',
            json={'sueldo_base': 1350},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Cargo actualizado exitosamente'
        
        # Verificar actualización
        with app.app_context():
            cargo_actualizado = Cargo.query.get(cargo_id)
            assert float(cargo_actualizado.sueldo_base) == 1350.0
    
    def test_eliminar_cargo(self, client, auth_headers, app):
        """DELETE /api/cargos/<id> debe eliminar el cargo"""
        # Crear cargo
        with app.app_context():
            cargo = Cargo(nombre_cargo='Temporal', sueldo_base=500, permisos='[]')
            db.session.add(cargo)
            db.session.commit()
            cargo_id = cargo.id_cargo
        
        response = client.delete(f'/api/cargos/{cargo_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Cargo eliminado exitosamente'
        
        # Verificar eliminación
        with app.app_context():
            cargo_eliminado = Cargo.query.get(cargo_id)
            assert cargo_eliminado is None
    
    def test_acceso_sin_token_rechazado(self, client):
        """Endpoints protegidos deben rechazar requests sin token"""
        response = client.get('/api/cargos/')
        assert response.status_code == 401
        
        response = client.post('/api/cargos/', json={'nombre_cargo': 'Test'})
        assert response.status_code == 401
