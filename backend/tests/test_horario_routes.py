"""
Tests de Integración para Horarios
Pruebas para CRUD completo y validaciones de horarios de empleados
"""
import pytest
from datetime import date, time, timedelta


@pytest.mark.integration
class TestHorarioRoutes:
    """Tests para los endpoints de horarios"""

    def test_crear_horario_exitoso(self, client, auth_headers, cargo_fixture):
        """Test: Crear un horario con datos válidos"""
        # Crear empleado
        empleado_data = {
            "nombre": "Miguel",
            "apellido": "Ángel",
            "email": "miguel.angel@test.com",
            "telefono": "111222333",
            "direccion": "Calle Horarios 1",
            "fecha_nacimiento": "1990-05-15",
            "fecha_contratacion": "2020-01-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "fecha_inicio": str(date.today()),
            "hora_entrada": "08:00:00",
            "hora_salida": "17:00:00",
            "descanso_minutos": 60,
            "turno": "matutino",
            "inicio_vigencia": str(date.today()),
            "fin_vigencia": str(date.today() + timedelta(days=365))
        }
        response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "horario" in response.json
        assert response.json["mensaje"] == "Horario creado exitosamente"

    def test_crear_horario_sin_empleado(self, client, auth_headers):
        """Test: Validar que se requiere id_empleado"""
        horario_data = {
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "08:00:00",
            "hora_salida": "17:00:00",
            "turno": "matutino"
        }
        response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "id_empleado" in response.json["error"].lower()

    def test_listar_horarios(self, client, auth_headers, cargo_fixture):
        """Test: Listar todos los horarios"""
        # Crear empleado
        empleado_data = {
            "nombre": "Lucía",
            "apellido": "Mendoza",
            "email": "lucia.mendoza@test.com",
            "telefono": "444555666",
            "direccion": "Avenida Test",
            "fecha_nacimiento": "1988-03-20",
            "fecha_contratacion": "2019-06-15",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Sábado",
            "hora_entrada": "09:00:00",
            "hora_salida": "18:00:00",
            "descanso_minutos": 45,
            "turno": "vespertino"
        }
        client.post("/api/horarios/", json=horario_data, headers=auth_headers)

        # Listar horarios
        response = client.get("/api/horarios/", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) > 0

    def test_obtener_horario_por_id(self, client, auth_headers, cargo_fixture):
        """Test: Obtener un horario específico por ID"""
        # Crear empleado
        empleado_data = {
            "nombre": "Ricardo",
            "apellido": "Flores",
            "email": "ricardo.flores@test.com",
            "telefono": "777888999",
            "direccion": "Plaza Principal",
            "fecha_nacimiento": "1985-11-11",
            "fecha_contratacion": "2017-09-20",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Jueves",
            "hora_entrada": "07:00:00",
            "hora_salida": "16:00:00",
            "descanso_minutos": 30,
            "turno": "matutino"
        }
        create_response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        horario_id = create_response.json["horario"]["id_horario"]

        # Obtener el horario
        response = client.get(f"/api/horarios/{horario_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["id_horario"] == horario_id
        assert response.json["turno"] == "matutino"

    def test_actualizar_horario(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar un horario existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Valentina",
            "apellido": "Cruz",
            "email": "valentina.cruz@test.com",
            "telefono": "333444555",
            "direccion": "Sector Norte",
            "fecha_nacimiento": "1992-07-07",
            "fecha_contratacion": "2020-05-05",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "08:00:00",
            "hora_salida": "17:00:00",
            "turno": "matutino"
        }
        create_response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        horario_id = create_response.json["horario"]["id_horario"]

        # Actualizar el horario
        update_data = {
            "hora_entrada": "09:00:00",
            "hora_salida": "18:00:00",
            "turno": "vespertino"
        }
        response = client.put(f"/api/horarios/{horario_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Horario actualizado exitosamente"

        # Verificar actualización
        get_response = client.get(f"/api/horarios/{horario_id}", headers=auth_headers)
        assert get_response.json["turno"] == "vespertino"
        assert get_response.json["hora_entrada"] == "09:00:00"

    def test_eliminar_horario(self, client, auth_headers, cargo_fixture):
        """Test: Eliminar un horario existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Sebastián",
            "apellido": "Reyes",
            "email": "sebastian.reyes@test.com",
            "telefono": "666777888",
            "direccion": "Urbanización Sur",
            "fecha_nacimiento": "1987-04-04",
            "fecha_contratacion": "2018-08-08",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "10:00:00",
            "hora_salida": "19:00:00",
            "turno": "vespertino"
        }
        create_response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        horario_id = create_response.json["horario"]["id_horario"]

        # Eliminar el horario
        response = client.delete(f"/api/horarios/{horario_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Horario eliminado exitosamente"

        # Verificar que ya no aparece en la lista
        list_response = client.get("/api/horarios/", headers=auth_headers)
        horario_ids = [h["id_horario"] for h in list_response.json]
        assert horario_id not in horario_ids

    def test_crear_horario_turno_nocturno(self, client, auth_headers, cargo_fixture):
        """Test: Crear horario con turno nocturno"""
        # Crear empleado
        empleado_data = {
            "nombre": "Natalia",
            "apellido": "Vargas",
            "email": "natalia.vargas@test.com",
            "telefono": "999000111",
            "direccion": "Centro",
            "fecha_nacimiento": "1991-09-09",
            "fecha_contratacion": "2019-11-11",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario nocturno
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "22:00:00",
            "hora_salida": "06:00:00",  # Del día siguiente
            "descanso_minutos": 30,
            "turno": "nocturno"
        }
        response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert response.json["horario"]["turno"] == "nocturno"

    def test_crear_horario_hora_salida_antes_de_entrada_no_nocturno(self, client, auth_headers, cargo_fixture):
        """Test: No permitir hora_salida < hora_entrada si el turno no es nocturno"""
        empleado_data = {
            "nombre": "Carlos",
            "apellido": "Pérez",
            "email": "carlos.perez@test.com",
            "telefono": "101010101",
            "direccion": "Calle Validaciones 123",
            "fecha_nacimiento": "1993-02-02",
            "fecha_contratacion": "2021-01-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "10:00:00",
            "hora_salida": "09:00:00",
            "turno": "matutino"
        }
        response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)

        assert response.status_code == 400
        assert "salida" in response.json["error"].lower()

    def test_crear_horario_con_vigencia(self, client, auth_headers, cargo_fixture):
        """Test: Crear horario con fechas de vigencia"""
        # Crear empleado
        empleado_data = {
            "nombre": "Daniel",
            "apellido": "Moreno",
            "email": "daniel.moreno@test.com",
            "telefono": "222333444",
            "direccion": "Barrio Nuevo",
            "fecha_nacimiento": "1989-02-02",
            "fecha_contratacion": "2020-10-10",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario con vigencia
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "08:00:00",
            "hora_salida": "17:00:00",
            "turno": "matutino",
            "inicio_vigencia": str(date.today()),
            "fin_vigencia": str(date.today() + timedelta(days=180))
        }
        response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "inicio_vigencia" in response.json["horario"]
        assert "fin_vigencia" in response.json["horario"]

    def test_actualizar_horario_descanso(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar minutos de descanso"""
        # Crear empleado
        empleado_data = {
            "nombre": "Carolina",
            "apellido": "Luna",
            "email": "carolina.luna@test.com",
            "telefono": "555666777",
            "direccion": "Zona Este",
            "fecha_nacimiento": "1994-06-06",
            "fecha_contratacion": "2022-03-03",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario
        horario_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "08:00:00",
            "hora_salida": "17:00:00",
            "descanso_minutos": 30,
            "turno": "matutino"
        }
        create_response = client.post("/api/horarios/", json=horario_data, headers=auth_headers)
        horario_id = create_response.json["horario"]["id_horario"]

        # Actualizar descanso
        update_data = {
            "descanso_minutos": 60
        }
        response = client.put(f"/api/horarios/{horario_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200

        # Verificar actualización
        get_response = client.get(f"/api/horarios/{horario_id}", headers=auth_headers)
        assert get_response.json["descanso_minutos"] == 60

    def test_multiples_horarios_mismo_empleado(self, client, auth_headers, cargo_fixture):
        """Test: Un empleado puede tener múltiples horarios (histórico)"""
        # Crear empleado
        empleado_data = {
            "nombre": "Alejandro",
            "apellido": "Torres",
            "email": "alejandro.torres@test.com",
            "telefono": "888999000",
            "direccion": "Residencial",
            "fecha_nacimiento": "1986-12-12",
            "fecha_contratacion": "2016-04-04",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear horario pasado
        horario1_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "08:00:00",
            "hora_salida": "17:00:00",
            "turno": "matutino",
            "inicio_vigencia": str(date.today() - timedelta(days=365)),
            "fin_vigencia": str(date.today() - timedelta(days=1))
        }
        client.post("/api/horarios/", json=horario1_data, headers=auth_headers)

        # Crear horario actual
        horario2_data = {
            "id_empleado": empleado_id,
            "dia_laborables": "Lunes a Viernes",
            "hora_entrada": "09:00:00",
            "hora_salida": "18:00:00",
            "turno": "vespertino",
            "inicio_vigencia": str(date.today()),
            "fin_vigencia": str(date.today() + timedelta(days=365))
        }
        client.post("/api/horarios/", json=horario2_data, headers=auth_headers)

        # Listar horarios
        response = client.get("/api/horarios/", headers=auth_headers)
        
        # Filtrar horarios del empleado
        horarios_empleado = [h for h in response.json if h["id_empleado"] == empleado_id]
        assert len(horarios_empleado) == 2
