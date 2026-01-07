"""
Tests de integración para endpoints de Nóminas
Usa fixtures de conftest.py
"""
import json
from datetime import date, timedelta
from extensions import db
from models.nomina import Nomina
from models.empleado import Empleado


class TestNominaCRUD:
    """Tests de integración para /api/nominas/"""
    
    def test_crear_nomina_exitoso(self, client, auth_headers, app, cargo_fixture):
        """POST /api/nominas/ debe crear una nómina"""
        # Primero crear un empleado
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Test',
                apellidos='Nomina',
                cedula='0999999999',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            empleado_id = empleado.id
        
        response = client.post(
            '/api/nominas/',
            json={
                'id_empleado': empleado_id,
                'mes': '2024-01',
                'total': 1500.00
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['mensaje'] == 'Nómina creada'
        assert 'id' in data
    
    def test_crear_nomina_sin_fechas_falla(self, client, auth_headers):
        """POST sin fechas válidas debe fallar"""
        response = client.post(
            '/api/nominas/',
            json={
                'id_empleado': 1,
                'total': 1000.00
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_listar_nominas(self, client, auth_headers, app, cargo_fixture):
        """GET /api/nominas/ debe listar todas las nóminas"""
        # Crear empleado y nómina
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Juan',
                apellidos='Pérez',
                cedula='0988888888',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            nomina = Nomina(
                id_empleado=empleado.id,
                mes='2024-01',
                total_desembolsar=2000.00
            )
            db.session.add(nomina)
            db.session.commit()
        
        response = client.get('/api/nominas/', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]['total_desembolsar'] == 2000.00
    
    def test_obtener_nomina_por_id(self, client, auth_headers, app, cargo_fixture):
        """GET /api/nominas/<id> debe retornar una nómina específica"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Carlos',
                apellidos='López',
                cedula='0977777777',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            nomina = Nomina(
                id_empleado=empleado.id,
                mes='2024-02',
                total_desembolsar=1800.00
            )
            db.session.add(nomina)
            db.session.commit()
            nomina_id = nomina.id_nomina
        
        response = client.get(f'/api/nominas/{nomina_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id_nomina'] == nomina_id
        assert data['total_desembolsar'] == 1800.00
    
    def test_actualizar_nomina(self, client, auth_headers, app, cargo_fixture):
        """PUT /api/nominas/<id> debe actualizar una nómina"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Ana',
                apellidos='Martínez',
                cedula='0966666666',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            nomina = Nomina(
                id_empleado=empleado.id,
                mes='2024-03',
                total_desembolsar=1500.00
            )
            db.session.add(nomina)
            db.session.commit()
            nomina_id = nomina.id_nomina
        
        response = client.put(
            f'/api/nominas/{nomina_id}',
            json={
                'total': 1750.00
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Nómina actualizada'
        
        # Verificar cambios
        with app.app_context():
            nomina_actualizada = Nomina.query.get(nomina_id)
            assert nomina_actualizada.total_desembolsar == 1750.00
    
    def test_eliminar_nomina(self, client, auth_headers, app, cargo_fixture):
        """DELETE /api/nominas/<id> debe eliminar una nómina"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Luis',
                apellidos='García',
                cedula='0955555555',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            nomina = Nomina(
                id_empleado=empleado.id,
                mes='2024-04',
                total_desembolsar=1600.00
            )
            db.session.add(nomina)
            db.session.commit()
            nomina_id = nomina.id_nomina
        
        response = client.delete(f'/api/nominas/{nomina_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Nómina eliminada'
        
        # Verificar que se eliminó
        with app.app_context():
            nomina_eliminada = Nomina.query.get(nomina_id)
            assert nomina_eliminada is None
