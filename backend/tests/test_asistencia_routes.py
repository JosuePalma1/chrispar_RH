"""
Tests de integración para endpoints de Asistencias
Usa fixtures de conftest.py
"""
import json
from datetime import date, time
from extensions import db
from models.asistencia import Asistencia
from models.empleado import Empleado


class TestAsistenciaCRUD:
    """Tests de integración para /api/asistencias/"""
    
    def test_crear_asistencia_exitoso(self, client, auth_headers, app, cargo_fixture):
        """POST /api/asistencias/ debe crear una asistencia"""
        # Crear empleado
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Pedro',
                apellidos='Asistencia',
                cedula='0944444444',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            empleado_id = empleado.id
        
        response = client.post(
            '/api/asistencias/',
            json={
                'id_empleado': empleado_id,
                'fecha': '2024-03-15',
                'hora_entrada': '08:30:00',
                'hora_salida': '17:30:00'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['mensaje'] == 'Asistencia creada'
        assert 'id' in data
    
    def test_crear_asistencia_sin_fecha_falla(self, client, auth_headers):
        """POST sin fecha válida debe fallar"""
        response = client.post(
            '/api/asistencias/',
            json={
                'id_empleado': 1,
                'hora_entrada': '08:00:00'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_listar_asistencias(self, client, auth_headers, app, cargo_fixture):
        """GET /api/asistencias/ debe listar todas las asistencias"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='María',
                apellidos='Rodríguez',
                cedula='0933333333',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            asistencia = Asistencia(
                id_empleado=empleado.id,
                fecha=date(2024, 3, 20),
                hora_entrada=time(8, 0),
                hora_salida=time(17, 0),
                horas_extra=1.0
            )
            db.session.add(asistencia)
            db.session.commit()
        
        response = client.get('/api/asistencias/', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_obtener_asistencia_por_id(self, client, auth_headers, app, cargo_fixture):
        """GET /api/asistencias/<id> debe retornar una asistencia específica"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Roberto',
                apellidos='Fernández',
                cedula='0922222222',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            asistencia = Asistencia(
                id_empleado=empleado.id,
                fecha=date(2024, 3, 25),
                hora_entrada=time(9, 0),
                hora_salida=time(18, 0),
                horas_extra=0.5
            )
            db.session.add(asistencia)
            db.session.commit()
            asistencia_id = asistencia.id_asistencia
        
        response = client.get(f'/api/asistencias/{asistencia_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id_asistencia'] == asistencia_id
        assert data['horas_extra'] == 0.5
    
    def test_actualizar_asistencia(self, client, auth_headers, app, cargo_fixture):
        """PUT /api/asistencias/<id> debe actualizar una asistencia"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Sofía',
                apellidos='Torres',
                cedula='0911111111',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            asistencia = Asistencia(
                id_empleado=empleado.id,
                fecha=date(2024, 4, 1),
                hora_entrada=time(8, 30),
                hora_salida=None,
                horas_extra=0.0
            )
            db.session.add(asistencia)
            db.session.commit()
            asistencia_id = asistencia.id_asistencia
        
        response = client.put(
            f'/api/asistencias/{asistencia_id}',
            json={
                'hora_salida': '17:45:00',
                'horas_extra': 2.0
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Asistencia actualizada'
    
    def test_eliminar_asistencia(self, client, auth_headers, app, cargo_fixture):
        """DELETE /api/asistencias/<id> debe eliminar una asistencia"""
        with app.app_context():
            empleado = Empleado(
                id_cargo=cargo_fixture,
                nombres='Diego',
                apellidos='Vásquez',
                cedula='0900000000',
                estado='activo',
                fecha_ingreso=date.today()
            )
            db.session.add(empleado)
            db.session.commit()
            
            asistencia = Asistencia(
                id_empleado=empleado.id,
                fecha=date(2024, 4, 5),
                hora_entrada=time(8, 0),
                hora_salida=time(17, 0)
            )
            db.session.add(asistencia)
            db.session.commit()
            asistencia_id = asistencia.id_asistencia
        
        response = client.delete(f'/api/asistencias/{asistencia_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['mensaje'] == 'Asistencia eliminada'
        
        # Verificar que se eliminó
        with app.app_context():
            asistencia_eliminada = Asistencia.query.get(asistencia_id)
            assert asistencia_eliminada is None
