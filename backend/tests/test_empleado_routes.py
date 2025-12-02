"""
Tests de integración para endpoints de Empleados
Usa fixtures de conftest.py
"""
import json
from datetime import date
from extensions import db
from models.empleado import Empleado
from models.cargo import Cargo


class TestEmpleadoCRUD:
    """Tests de integración para /api/empleados/"""
    
    def test_crear_empleado_exitoso(self, client, auth_headers, cargo_fixture):
        """POST /api/empleados/ debe crear un empleado"""
        response = client.post(
            '/api/empleados/',
            json={
                'id_cargo': cargo_fixture,
                'nombres': 'Juan Carlos',
                'apellidos': 'Pérez López',
                'cedula': '0912345678',
                'fecha_nacimiento': '1990-05-15',
                'fecha_ingreso': '2023-01-10',
                'estado': 'activo',
                'tipo_cuenta_bancaria': 'Ahorros',
                'numero_cuenta_bancaria': '1234567890',
                'modalidad_fondo_reserva': 'Mensual',
                'modalidad_decimos': 'Acumulado'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['mensaje'] == 'Empleado creado'
        assert 'id' in data
        assert isinstance(data['id'], int)
    
    def test_crear_empleado_sin_cargo_falla(self, client, auth_headers):
        """POST sin id_cargo debe fallar"""
        response = client.post(
            '/api/empleados/',
            json={
                'nombres': 'Test',
                'apellidos': 'User',
                'cedula': '0923456789'
            },
            headers=auth_headers
        )
        
        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_listar_empleados(self, client, auth_headers, app, cargo_fixture):
        """GET /api/empleados/ debe listar todos los empleados"""
        # Crear empleados de prueba
        with app.app_context():
            emp1 = Empleado(
                id_cargo=cargo_fixture,
                nombres='Ana',
                apellidos='Gómez',
                cedula='0912345679',
                estado='activo',
                fecha_nacimiento=date(1992, 3, 20),
                fecha_ingreso=date(2024, 1, 1)
            )
            emp2 = Empleado(
                id_cargo=cargo_fixture,
                nombres='Luis',
                apellidos='Martínez',
                cedula='0912345680',
                estado='inactivo',
                fecha_nacimiento=date(1988, 7, 10),
                fecha_ingreso=date(2022, 6, 15)
            )
            db.session.add_all([emp1, emp2])
            db.session.commit()
        
        response = client.get('/api/empleados/', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        assert any(e['nombres'] == 'Ana' for e in data)
        assert any(e['nombres'] == 'Luis' for e in data)
    
    def test_obtener_empleado_por_id(self, client, auth_headers, app, cargo_fixture):
        """GET /api/empleados/<id> debe devolver el empleado"""
        with app.app_context():
            emp = Empleado(
                id_cargo=cargo_fixture,
                nombres='María',
                apellidos='Rodríguez',
                cedula='0934567890',
                estado='activo',
                fecha_nacimiento=date(1995, 11, 5),
                fecha_ingreso=date(2023, 5, 1)
            )
            db.session.add(emp)
            db.session.commit()
            emp_id = emp.id
        
        response = client.get(f'/api/empleados/{emp_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['nombres'] == 'María'
        assert data['cedula'] == '0934567890'
    
    def test_actualizar_empleado(self, client, auth_headers, app, cargo_fixture):
        """PUT /api/empleados/<id> debe actualizar el empleado"""
        with app.app_context():
            emp = Empleado(
                id_cargo=cargo_fixture,
                nombres='Pedro',
                apellidos='Sánchez',
                cedula='0945678901',
                estado='activo',
                fecha_nacimiento=date(1987, 4, 12),
                fecha_ingreso=date(2021, 2, 1)
            )
            db.session.add(emp)
            db.session.commit()
            emp_id = emp.id
        
        response = client.put(
            f'/api/empleados/{emp_id}',
            json={'estado': 'inactivo'},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Empleado actualizado'
        
        # Verificar cambio
        with app.app_context():
            emp_actualizado = Empleado.query.get(emp_id)
            assert emp_actualizado.estado == 'inactivo'
    
    def test_eliminar_empleado(self, client, auth_headers, app, cargo_fixture):
        """DELETE /api/empleados/<id> debe eliminar el empleado"""
        with app.app_context():
            emp = Empleado(
                id_cargo=cargo_fixture,
                nombres='Temporal',
                apellidos='Test',
                cedula='0956789012',
                estado='activo',
                fecha_nacimiento=date(1990, 1, 1),
                fecha_ingreso=date(2024, 1, 1)
            )
            db.session.add(emp)
            db.session.commit()
            emp_id = emp.id
        
        response = client.delete(f'/api/empleados/{emp_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Empleado eliminado'
        
        # Verificar eliminación
        with app.app_context():
            emp_eliminado = Empleado.query.get(emp_id)
            assert emp_eliminado is None

