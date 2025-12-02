"""
Tests de Integración para Permisos
Pruebas para CRUD completo y validaciones de permisos de empleados
"""
import pytest
from datetime import date, timedelta


@pytest.mark.integration
class TestPermisoRoutes:
    """Tests para los endpoints de permisos"""

    def test_crear_permiso_exitoso(self, client, auth_headers, cargo_fixture):
        """Test: Crear un permiso con datos válidos"""
        # Primero crear un empleado
        empleado_data = {
            "nombre": "Juan",
            "apellido": "Pérez",
            "email": "juan.perez@test.com",
            "telefono": "123456789",
            "direccion": "Calle 123",
            "fecha_nacimiento": "1990-01-01",
            "fecha_contratacion": "2020-01-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        assert emp_response.status_code == 201
        empleado_id = emp_response.json["id"]

        # Crear permiso
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "vacaciones",
            "descripcion": "Vacaciones de verano",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=7)),
            "estado": "pendiente"
        }
        response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "id" in response.json
        assert response.json["mensaje"] == "Permiso creado"

    def test_crear_permiso_sin_fecha_inicio(self, client, auth_headers, cargo_fixture):
        """Test: Validar que se requiere fecha_inicio"""
        # Crear empleado
        empleado_data = {
            "nombre": "María",
            "apellido": "González",
            "email": "maria.gonzalez@test.com",
            "telefono": "987654321",
            "direccion": "Avenida 456",
            "fecha_nacimiento": "1985-05-15",
            "fecha_contratacion": "2019-06-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Intentar crear permiso sin fecha_inicio
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "descripcion": "Permiso médico",
            "fecha_fin": str(date.today() + timedelta(days=2))
        }
        response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "fecha_inicio" in response.json["error"].lower()

    def test_crear_permiso_tipo_invalido(self, client, auth_headers, cargo_fixture):
        """Test: Validar que tipo debe ser permiso, vacaciones o licencia"""
        # Crear empleado
        empleado_data = {
            "nombre": "Carlos",
            "apellido": "Ramírez",
            "email": "carlos.ramirez@test.com",
            "telefono": "555666777",
            "direccion": "Plaza 789",
            "fecha_nacimiento": "1992-03-20",
            "fecha_contratacion": "2021-02-15",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Intentar crear permiso con tipo inválido
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "ausencia",  # Tipo no válido
            "descripcion": "Ausencia injustificada",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=1))
        }
        response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "tipo inválido" in response.json["error"].lower()

    def test_crear_permiso_fecha_fin_anterior(self, client, auth_headers, cargo_fixture):
        """Test: Validar que fecha_fin no sea anterior a fecha_inicio"""
        # Crear empleado
        empleado_data = {
            "nombre": "Ana",
            "apellido": "Martínez",
            "email": "ana.martinez@test.com",
            "telefono": "111222333",
            "direccion": "Calle Principal",
            "fecha_nacimiento": "1988-08-08",
            "fecha_contratacion": "2018-09-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Intentar crear permiso con fecha_fin anterior a fecha_inicio
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "licencia",
            "descripcion": "Licencia médica",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() - timedelta(days=5))  # Fecha anterior
        }
        response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "fecha_fin no puede ser anterior" in response.json["error"].lower()

    def test_listar_permisos(self, client, auth_headers, cargo_fixture):
        """Test: Listar todos los permisos"""
        # Crear empleado y permiso
        empleado_data = {
            "nombre": "Luis",
            "apellido": "Fernández",
            "email": "luis.fernandez@test.com",
            "telefono": "444555666",
            "direccion": "Carrera 100",
            "fecha_nacimiento": "1991-11-11",
            "fecha_contratacion": "2020-05-20",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "descripcion": "Permiso personal",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=1)),
            "estado": "aprobado"
        }
        client.post("/api/permisos/", json=permiso_data, headers=auth_headers)

        # Listar permisos
        response = client.get("/api/permisos/", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) > 0

    def test_listar_permisos_filtrado_por_empleado(self, client, auth_headers, cargo_fixture):
        """Test: Filtrar permisos por id_empleado"""
        # Crear dos empleados
        empleado1_data = {
            "nombre": "Pedro",
            "apellido": "López",
            "email": "pedro.lopez@test.com",
            "telefono": "777888999",
            "direccion": "Zona Norte",
            "fecha_nacimiento": "1987-04-04",
            "fecha_contratacion": "2017-03-10",
            "id_cargo": cargo_fixture
        }
        emp1_response = client.post("/api/empleados/", json=empleado1_data, headers=auth_headers)
        empleado1_id = emp1_response.json["id"]

        empleado2_data = {
            "nombre": "Sofía",
            "apellido": "Torres",
            "email": "sofia.torres@test.com",
            "telefono": "333444555",
            "direccion": "Zona Sur",
            "fecha_nacimiento": "1993-07-07",
            "fecha_contratacion": "2022-01-01",
            "id_cargo": cargo_fixture
        }
        emp2_response = client.post("/api/empleados/", json=empleado2_data, headers=auth_headers)
        empleado2_id = emp2_response.json["id"]

        # Crear permisos para cada empleado
        permiso1_data = {
            "id_empleado": empleado1_id,
            "tipo": "vacaciones",
            "descripcion": "Vacaciones de fin de año",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=10)),
            "estado": "aprobado"
        }
        client.post("/api/permisos/", json=permiso1_data, headers=auth_headers)

        permiso2_data = {
            "id_empleado": empleado2_id,
            "tipo": "permiso",
            "descripcion": "Permiso por trámite",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=1)),
            "estado": "pendiente"
        }
        client.post("/api/permisos/", json=permiso2_data, headers=auth_headers)

        # Filtrar permisos del empleado 1
        response = client.get(f"/api/permisos/?id_empleado={empleado1_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        # Verificar que todos los permisos correspondan al empleado 1
        for permiso in response.json:
            assert permiso["id_empleado"] == empleado1_id

    def test_listar_permisos_filtrado_por_estado(self, client, auth_headers, cargo_fixture):
        """Test: Filtrar permisos por estado"""
        # Crear empleado
        empleado_data = {
            "nombre": "Elena",
            "apellido": "Vargas",
            "email": "elena.vargas@test.com",
            "telefono": "666777888",
            "direccion": "Centro",
            "fecha_nacimiento": "1989-09-09",
            "fecha_contratacion": "2019-11-11",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear permisos con diferentes estados
        permiso_aprobado = {
            "id_empleado": empleado_id,
            "tipo": "vacaciones",
            "descripcion": "Vacaciones aprobadas",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=5)),
            "estado": "aprobado"
        }
        client.post("/api/permisos/", json=permiso_aprobado, headers=auth_headers)

        permiso_pendiente = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "descripcion": "Permiso en espera",
            "fecha_inicio": str(date.today() + timedelta(days=10)),
            "fecha_fin": str(date.today() + timedelta(days=11)),
            "estado": "pendiente"
        }
        client.post("/api/permisos/", json=permiso_pendiente, headers=auth_headers)

        # Filtrar solo los aprobados
        response = client.get("/api/permisos/?estado=aprobado", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        # Verificar que todos sean aprobados
        for permiso in response.json:
            assert permiso["estado"] == "aprobado"

    def test_obtener_permiso_por_id(self, client, auth_headers, cargo_fixture):
        """Test: Obtener un permiso específico por ID"""
        # Crear empleado
        empleado_data = {
            "nombre": "Diego",
            "apellido": "Ruiz",
            "email": "diego.ruiz@test.com",
            "telefono": "999000111",
            "direccion": "Barrio Nuevo",
            "fecha_nacimiento": "1994-12-12",
            "fecha_contratacion": "2021-08-15",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear permiso
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "licencia",
            "descripcion": "Licencia de paternidad",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=15)),
            "estado": "aprobado"
        }
        create_response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        permiso_id = create_response.json["id"]

        # Obtener el permiso
        response = client.get(f"/api/permisos/{permiso_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["id_permiso"] == permiso_id
        assert response.json["tipo"] == "licencia"
        assert response.json["estado"] == "aprobado"

    def test_actualizar_permiso(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar un permiso existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Laura",
            "apellido": "Gómez",
            "email": "laura.gomez@test.com",
            "telefono": "222333444",
            "direccion": "Urbanización Elite",
            "fecha_nacimiento": "1986-06-06",
            "fecha_contratacion": "2016-04-04",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear permiso
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "descripcion": "Permiso médico",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=3)),
            "estado": "pendiente"
        }
        create_response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        permiso_id = create_response.json["id"]

        # Actualizar el permiso (aprobar y cambiar descripción)
        update_data = {
            "estado": "aprobado",
            "descripcion": "Permiso médico aprobado - cita especialista",
            "autorizado_por": "Dr. Pérez"
        }
        response = client.put(f"/api/permisos/{permiso_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Permiso actualizado"

        # Verificar actualización
        get_response = client.get(f"/api/permisos/{permiso_id}", headers=auth_headers)
        assert get_response.json["estado"] == "aprobado"
        assert get_response.json["autorizado_por"] == "Dr. Pérez"

    def test_actualizar_permiso_tipo_invalido(self, client, auth_headers, cargo_fixture):
        """Test: Validar tipo al actualizar permiso"""
        # Crear empleado
        empleado_data = {
            "nombre": "Roberto",
            "apellido": "Sánchez",
            "email": "roberto.sanchez@test.com",
            "telefono": "555111222",
            "direccion": "Residencial",
            "fecha_nacimiento": "1990-02-02",
            "fecha_contratacion": "2020-10-10",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear permiso
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "descripcion": "Permiso personal",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=2)),
            "estado": "pendiente"
        }
        create_response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        permiso_id = create_response.json["id"]

        # Intentar actualizar con tipo inválido
        update_data = {
            "tipo": "ausencia"  # Tipo no válido
        }
        response = client.put(f"/api/permisos/{permiso_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "tipo inválido" in response.json["error"].lower()

    def test_actualizar_permiso_fechas_invalidas(self, client, auth_headers, cargo_fixture):
        """Test: Validar fechas al actualizar permiso"""
        # Crear empleado
        empleado_data = {
            "nombre": "Isabel",
            "apellido": "Castro",
            "email": "isabel.castro@test.com",
            "telefono": "888999000",
            "direccion": "Sector Este",
            "fecha_nacimiento": "1995-05-05",
            "fecha_contratacion": "2022-03-03",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear permiso
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "vacaciones",
            "descripcion": "Vacaciones de medio año",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=7)),
            "estado": "pendiente"
        }
        create_response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        permiso_id = create_response.json["id"]

        # Intentar actualizar con fecha_fin anterior a fecha_inicio
        update_data = {
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() - timedelta(days=3))  # Anterior
        }
        response = client.put(f"/api/permisos/{permiso_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "fecha_fin no puede ser anterior" in response.json["error"].lower()

    def test_eliminar_permiso(self, client, auth_headers, cargo_fixture):
        """Test: Eliminar un permiso existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Fernando",
            "apellido": "Morales",
            "email": "fernando.morales@test.com",
            "telefono": "111333555",
            "direccion": "Calle 50",
            "fecha_nacimiento": "1992-10-10",
            "fecha_contratacion": "2021-05-05",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear permiso
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "descripcion": "Permiso temporal",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=1)),
            "estado": "pendiente"
        }
        create_response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        permiso_id = create_response.json["id"]

        # Eliminar el permiso
        response = client.delete(f"/api/permisos/{permiso_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Permiso eliminado"

        # Verificar que ya no aparece en la lista
        list_response = client.get("/api/permisos/", headers=auth_headers)
        permiso_ids = [p["id_permiso"] for p in list_response.json]
        assert permiso_id not in permiso_ids

    def test_crear_permiso_sin_descripcion(self, client, auth_headers, cargo_fixture):
        """Test: Validar que se requiere descripción"""
        # Crear empleado
        empleado_data = {
            "nombre": "Patricia",
            "apellido": "Rojas",
            "email": "patricia.rojas@test.com",
            "telefono": "444666888",
            "direccion": "Avenida Central",
            "fecha_nacimiento": "1988-03-03",
            "fecha_contratacion": "2018-07-07",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Intentar crear permiso sin descripción
        permiso_data = {
            "id_empleado": empleado_id,
            "tipo": "permiso",
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=1))
        }
        response = client.post("/api/permisos/", json=permiso_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "descripcion" in response.json["error"].lower()

