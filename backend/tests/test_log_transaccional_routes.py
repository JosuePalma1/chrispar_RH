"""
Tests de integración para rutas de log_transaccional
Prueba operaciones CRUD, filtrado, paginación y auditoría
"""
import json
from datetime import datetime, timedelta
from models.log_transaccional import LogTransaccional
from extensions import db


class TestLogTransaccionalRoutes:
    """Tests para el módulo de logs transaccionales"""
    
    def test_get_all_logs_empty(self, client, auth_headers):
        """GET /api/logs/ - Lista vacía cuando no hay logs"""
        response = client.get('/api/logs/', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'logs' in data
        assert data['total'] == 0
        assert data['page'] == 1
    
    def test_get_all_logs_with_pagination(self, client, auth_headers, app):
        """GET /api/logs/ - Paginación funciona correctamente"""
        # Crear 25 logs para probar paginación
        with app.app_context():
            for i in range(25):
                log = LogTransaccional(
                    tabla_afectada='empleados',
                    operacion='INSERT',
                    id_registro=i + 1,
                    usuario='admin',
                    datos_nuevos=f'{{"nombres": "Empleado {i}"}}'
                )
                db.session.add(log)
            db.session.commit()
        
        # Primera página (default 10 items)
        response = client.get('/api/logs/', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['logs']) == 10
        assert data['total'] == 25
        assert data['total_pages'] == 3
        assert data['has_next'] is True
        assert data['has_prev'] is False
        
        # Segunda página
        response = client.get('/api/logs/?page=2', headers=auth_headers)
        data = json.loads(response.data)
        assert len(data['logs']) == 10
        assert data['page'] == 2
        assert data['has_prev'] is True
        
        # Tercera página (5 items restantes)
        response = client.get('/api/logs/?page=3', headers=auth_headers)
        data = json.loads(response.data)
        assert len(data['logs']) == 5
        assert data['has_next'] is False
    
    def test_get_logs_with_custom_per_page(self, client, auth_headers, app):
        """GET /api/logs/ - per_page personalizado funciona"""
        with app.app_context():
            for i in range(15):
                log = LogTransaccional(
                    tabla_afectada='cargos',
                    operacion='UPDATE',
                    id_registro=i + 1,
                    usuario='admin'
                )
                db.session.add(log)
            db.session.commit()
        
        response = client.get('/api/logs/?per_page=5', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['logs']) == 5
        assert data['per_page'] == 5
        assert data['total_pages'] == 3
    
    def test_filter_logs_by_tabla(self, client, auth_headers, app):
        """GET /api/logs/?tabla=X - Filtra por tabla afectada"""
        with app.app_context():
            # Crear logs de diferentes tablas
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT', 
                id_registro=1, usuario='admin'
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE', 
                id_registro=1, usuario='admin'
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='cargos', operacion='INSERT', 
                id_registro=2, usuario='admin'
            ))
            db.session.commit()
        
        response = client.get('/api/logs/?tabla=empleados', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total'] == 2
        for log in data['logs']:
            assert log['tabla_afectada'] == 'empleados'
    
    def test_filter_logs_by_operacion(self, client, auth_headers, app):
        """GET /api/logs/?operacion=X - Filtra por tipo de operación"""
        with app.app_context():
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT', 
                id_registro=1, usuario='admin'
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE', 
                id_registro=1, usuario='admin'
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='DELETE', 
                id_registro=1, usuario='admin'
            ))
            db.session.commit()
        
        response = client.get('/api/logs/?operacion=UPDATE', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total'] == 1
        assert data['logs'][0]['operacion'] == 'UPDATE'
    
    def test_filter_logs_by_fecha_desde(self, client, auth_headers, app):
        """GET /api/logs/?fecha_desde=X - Filtra desde fecha específica"""
        with app.app_context():
            # Log antiguo (3 días atrás)
            log_old = LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT',
                id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=3)
            )
            # Log reciente (hoy)
            log_new = LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE',
                id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow()
            )
            db.session.add_all([log_old, log_new])
            db.session.commit()
        
        # Filtrar desde hace 2 días
        fecha_desde = (datetime.utcnow() - timedelta(days=2)).strftime('%Y-%m-%d')
        response = client.get(f'/api/logs/?fecha_desde={fecha_desde}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total'] == 1  # Solo el log reciente
    
    def test_filter_logs_by_fecha_hasta(self, client, auth_headers, app):
        """GET /api/logs/?fecha_hasta=X - Filtra hasta fecha específica"""
        with app.app_context():
            # Log antiguo (3 días atrás)
            log_old = LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT',
                id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=3)
            )
            # Log reciente (hoy)
            log_new = LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE',
                id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow()
            )
            db.session.add_all([log_old, log_new])
            db.session.commit()
        
        # Filtrar hasta hace 2 días
        fecha_hasta = (datetime.utcnow() - timedelta(days=2)).strftime('%Y-%m-%d')
        response = client.get(f'/api/logs/?fecha_hasta={fecha_hasta}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total'] == 1  # Solo el log antiguo
    
    def test_filter_logs_by_fecha_range(self, client, auth_headers, app):
        """GET /api/logs/?fecha_desde=X&fecha_hasta=Y - Filtra rango de fechas"""
        with app.app_context():
            # 3 logs en diferentes fechas
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT', id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=5)
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE', id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=2)
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='DELETE', id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow()
            ))
            db.session.commit()
        
        # Filtrar rango: hace 3 días hasta hace 1 día
        fecha_desde = (datetime.utcnow() - timedelta(days=3)).strftime('%Y-%m-%d')
        fecha_hasta = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
        response = client.get(
            f'/api/logs/?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total'] == 1  # Solo el log del medio
    
    def test_filter_logs_invalid_fecha_desde_format(self, client, auth_headers):
        """GET /api/logs/?fecha_desde=invalid - Error con formato de fecha inválido"""
        response = client.get('/api/logs/?fecha_desde=invalid-date', headers=auth_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'fecha_desde' in data['error'].lower()
    
    def test_filter_logs_invalid_fecha_hasta_format(self, client, auth_headers):
        """GET /api/logs/?fecha_hasta=invalid - Error con formato de fecha inválido"""
        response = client.get('/api/logs/?fecha_hasta=2024-13-45', headers=auth_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'fecha_hasta' in data['error'].lower()
    
    def test_filter_logs_multiple_filters(self, client, auth_headers, app):
        """GET /api/logs/ - Combina múltiples filtros"""
        with app.app_context():
            # Logs mixtos
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT', 
                id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=1)
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE', 
                id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow()
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='cargos', operacion='UPDATE', 
                id_registro=2, usuario='admin',
                fecha_hora=datetime.utcnow()
            ))
            db.session.commit()
        
        # Filtrar: tabla=empleados, operacion=UPDATE, fecha reciente
        fecha_desde = (datetime.utcnow() - timedelta(hours=12)).strftime('%Y-%m-%d')
        response = client.get(
            f'/api/logs/?tabla=empleados&operacion=UPDATE&fecha_desde={fecha_desde}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total'] == 1
        log = data['logs'][0]
        assert log['tabla_afectada'] == 'empleados'
        assert log['operacion'] == 'UPDATE'
    
    def test_get_log_by_id(self, client, auth_headers, app):
        """GET /api/logs/<id> - Obtiene log específico por ID"""
        with app.app_context():
            log = LogTransaccional(
                tabla_afectada='empleados',
                operacion='INSERT',
                id_registro=123,
                usuario='admin',
                datos_nuevos='{"nombres": "Juan", "apellidos": "Pérez"}'
            )
            db.session.add(log)
            db.session.commit()
            log_id = log.id
        
        response = client.get(f'/api/logs/{log_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id'] == log_id
        assert data['tabla_afectada'] == 'empleados'
        assert data['operacion'] == 'INSERT'
        assert data['id_registro'] == 123
        assert 'Juan' in data['datos_nuevos']
    
    def test_get_log_by_id_not_found(self, client, auth_headers):
        """GET /api/logs/999999 - Error 404 si log no existe"""
        response = client.get('/api/logs/999999', headers=auth_headers)
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_get_logs_by_tabla_endpoint(self, client, auth_headers, app):
        """GET /api/logs/tabla/<tabla> - Endpoint legacy de filtrado por tabla"""
        with app.app_context():
            db.session.add(LogTransaccional(
                tabla_afectada='nominas', operacion='INSERT', 
                id_registro=1, usuario='admin'
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='nominas', operacion='UPDATE', 
                id_registro=1, usuario='admin'
            ))
            db.session.add(LogTransaccional(
                tabla_afectada='cargos', operacion='INSERT', 
                id_registro=2, usuario='admin'
            ))
            db.session.commit()
        
        response = client.get('/api/logs/tabla/nominas', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        for log in data:
            assert log['tabla_afectada'] == 'nominas'
    
    def test_logs_ordered_by_fecha_desc(self, client, auth_headers, app):
        """GET /api/logs/ - Logs ordenados por fecha descendente (más reciente primero)"""
        with app.app_context():
            log1 = LogTransaccional(
                tabla_afectada='empleados', operacion='INSERT', id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=2)
            )
            log2 = LogTransaccional(
                tabla_afectada='empleados', operacion='UPDATE', id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow() - timedelta(days=1)
            )
            log3 = LogTransaccional(
                tabla_afectada='empleados', operacion='DELETE', id_registro=1, usuario='admin',
                fecha_hora=datetime.utcnow()
            )
            db.session.add_all([log1, log2, log3])
            db.session.commit()
        
        response = client.get('/api/logs/', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        logs = data['logs']
        
        # Verificar orden descendente
        assert logs[0]['operacion'] == 'DELETE'  # Más reciente
        assert logs[1]['operacion'] == 'UPDATE'
        assert logs[2]['operacion'] == 'INSERT'  # Más antiguo
    
    def test_log_contains_audit_data(self, client, auth_headers, app):
        """Verificar que los logs contengan datos de auditoría completos"""
        with app.app_context():
            log = LogTransaccional(
                tabla_afectada='empleados',
                operacion='UPDATE',
                id_registro=10,
                usuario='admin_user',
                datos_anteriores='{"sueldo": 1000}',
                datos_nuevos='{"sueldo": 1500}'
            )
            db.session.add(log)
            db.session.commit()
            log_id = log.id
        
        response = client.get(f'/api/logs/{log_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verificar campos de auditoría
        assert data['usuario'] == 'admin_user'
        assert data['datos_anteriores'] == '{"sueldo": 1000}'
        assert data['datos_nuevos'] == '{"sueldo": 1500}'
        assert 'fecha_hora' in data
        assert data['fecha_hora'] is not None
    
    def test_logs_without_authentication(self, client):
        """GET /api/logs/ - Requiere autenticación"""
        response = client.get('/api/logs/')
        assert response.status_code == 401
