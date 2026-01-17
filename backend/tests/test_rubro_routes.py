"""
Tests de Integración para Rubros
Pruebas para CRUD completo y validaciones de rubros de nómina
"""
import pytest
from datetime import date, timedelta


@pytest.mark.integration
class TestRubroRoutes:
    """Tests para los endpoints de rubros"""

    def test_crear_rubro_devengo_exitoso(self, client, auth_headers, cargo_fixture):
        """Test: Crear un rubro tipo devengo con datos válidos"""
        # Crear empleado
        empleado_data = {
            "nombre": "Andrés",
            "apellido": "Silva",
            "email": "andres.silva@test.com",
            "telefono": "111222333",
            "direccion": "Calle 10",
            "fecha_nacimiento": "1988-05-15",
            "fecha_contratacion": "2018-03-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-01",
            "sueldo_base": 3600.0,
            "horas_extra": 900.0,
            "total_desembolsar": 4500.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Bono de productividad",
            "tipo": "devengo",
            "monto": 300.0
        }
        response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "id" in response.json
        assert response.json["mensaje"] == "Rubro creado"

    def test_crear_rubro_deduccion_exitoso(self, client, auth_headers, cargo_fixture):
        """Test: Crear un rubro tipo deducción"""
        # Crear empleado
        empleado_data = {
            "nombre": "Beatriz",
            "apellido": "Navarro",
            "email": "beatriz.navarro@test.com",
            "telefono": "444555666",
            "direccion": "Avenida 20",
            "fecha_nacimiento": "1990-08-22",
            "fecha_contratacion": "2019-06-15",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-01",
            "sueldo_base": 2560.0,
            "horas_extra": 640.0,
            "total_desembolsar": 3200.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro deducción
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Descuento préstamo",
            "tipo": "deduccion",
            "monto": 200.0
        }
        response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "id" in response.json

    def test_crear_rubro_sin_nomina(self, client, auth_headers):
        """Test: Validar que se requiere id_nomina"""
        rubro_data = {
            "motivo": "Bono sin nómina",
            "tipo": "devengo",
            "monto": 100.0
        }
        response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        
        assert response.status_code == 400  # Error porque falta id_nomina (Bad Request es correcto)

    def test_listar_rubros(self, client, auth_headers, cargo_fixture):
        """Test: Listar todos los rubros"""
        # Crear empleado
        empleado_data = {
            "nombre": "Carlos",
            "apellido": "Mendoza",
            "email": "carlos.mendoza@test.com",
            "telefono": "777888999",
            "direccion": "Calle 30",
            "fecha_nacimiento": "1985-12-10",
            "fecha_contratacion": "2016-09-20",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-01",
            "sueldo_base": 4320.0,
            "horas_extra": 1080.0,
            "total_desembolsar": 5400.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubros
        rubro1_data = {
            "id_nomina": nomina_id,
            "motivo": "Horas extra",
            "tipo": "devengo",
            "monto": 250.0
        }
        client.post("/api/rubros/", json=rubro1_data, headers=auth_headers)

        rubro2_data = {
            "id_nomina": nomina_id,
            "motivo": "Seguro médico",
            "tipo": "deduccion",
            "monto": 150.0
        }
        client.post("/api/rubros/", json=rubro2_data, headers=auth_headers)

        # Listar rubros
        response = client.get("/api/rubros/", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) >= 2

    def test_listar_rubros_filtrado_por_nomina(self, client, auth_headers, cargo_fixture):
        """Test: Filtrar rubros por id_nomina"""
        # Crear empleado
        empleado_data = {
            "nombre": "Diana",
            "apellido": "Ortiz",
            "email": "diana.ortiz@test.com",
            "telefono": "333444555",
            "direccion": "Plaza 40",
            "fecha_nacimiento": "1992-03-25",
            "fecha_contratacion": "2020-01-10",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear dos nóminas
        nomina1_data = {
            "id_empleado": empleado_id,
            "mes": "2024-01",
            "total": 3150.0
        }
        nomina1_response = client.post("/api/nominas/", json=nomina1_data, headers=auth_headers)
        nomina1_id = nomina1_response.json["id"]

        nomina2_data = {
            "id_empleado": empleado_id,
            "mes": "2024-02",
            "total": 3150.0
        }
        nomina2_response = client.post("/api/nominas/", json=nomina2_data, headers=auth_headers)
        nomina2_id = nomina2_response.json["id"]

        # Crear rubros para cada nómina
        rubro1_data = {
            "id_nomina": nomina1_id,
            "motivo": "Bono mes 1",
            "tipo": "devengo",
            "monto": 200.0
        }
        client.post("/api/rubros/", json=rubro1_data, headers=auth_headers)

        rubro2_data = {
            "id_nomina": nomina2_id,
            "motivo": "Bono mes 2",
            "tipo": "devengo",
            "monto": 300.0
        }
        client.post("/api/rubros/", json=rubro2_data, headers=auth_headers)

        # Filtrar rubros de la primera nómina
        response = client.get(f"/api/rubros/?id_nomina={nomina1_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        # Verificar que todos los rubros correspondan a nomina1
        for rubro in response.json:
            assert rubro["id_nomina"] == nomina1_id

    def test_obtener_rubro_por_id(self, client, auth_headers, cargo_fixture):
        """Test: Obtener un rubro específico por ID"""
        # Crear empleado
        empleado_data = {
            "nombre": "Eduardo",
            "apellido": "Parra",
            "email": "eduardo.parra@test.com",
            "telefono": "666777888",
            "direccion": "Sector Norte",
            "fecha_nacimiento": "1987-07-07",
            "fecha_contratacion": "2017-11-11",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-03",
            "sueldo_base": 3240.0,
            "horas_extra": 810.0,
            "total_desembolsar": 4050.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Comisión por ventas",
            "tipo": "devengo",
            "monto": 500.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Obtener el rubro
        response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["id_rubro"] == rubro_id
        assert response.json["tipo"] == "devengo"
        assert response.json["monto"] == 500.0

    def test_actualizar_rubro(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar un rubro existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Fernanda",
            "apellido": "Vega",
            "email": "fernanda.vega@test.com",
            "telefono": "999000111",
            "direccion": "Urbanización Sur",
            "fecha_nacimiento": "1991-09-09",
            "fecha_contratacion": "2019-04-04",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-04",
            "sueldo_base": 3960.0,
            "horas_extra": 990.0,
            "total_desembolsar": 4950.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Descuento provisional",
            "tipo": "deduccion",
            "monto": 100.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Actualizar el rubro
        update_data = {
            "monto": 150.0,
            "motivo": "Descuento revisado"
        }
        response = client.put(f"/api/rubros/{rubro_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Rubro actualizado"

        # Verificar actualización
        get_response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        assert get_response.json["monto"] == 150.0
        assert get_response.json["motivo"] == "Descuento revisado"

    def test_actualizar_rubro_cambiar_tipo(self, client, auth_headers, cargo_fixture):
        """Test: Cambiar el tipo de un rubro (devengo a deducción)"""
        # Crear empleado
        empleado_data = {
            "nombre": "Gabriel",
            "apellido": "Moreno",
            "email": "gabriel.moreno@test.com",
            "telefono": "222333444",
            "direccion": "Calle 50",
            "fecha_nacimiento": "1989-11-11",
            "fecha_contratacion": "2018-08-08",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-05",
            "sueldo_base": 3456.0,
            "horas_extra": 864.0,
            "total_desembolsar": 4320.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Bono inicial",
            "tipo": "devengo",
            "monto": 200.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Cambiar tipo
        update_data = {
            "tipo": "deduccion"
        }
        response = client.put(f"/api/rubros/{rubro_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200

        # Verificar cambio
        get_response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        assert get_response.json["tipo"] == "deduccion"

    def test_eliminar_rubro(self, client, auth_headers, cargo_fixture):
        """Test: Eliminar un rubro existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Helena",
            "apellido": "Cruz",
            "email": "helena.cruz@test.com",
            "telefono": "555666777",
            "direccion": "Barrio Centro",
            "fecha_nacimiento": "1993-04-04",
            "fecha_contratacion": "2021-02-02",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-06",
            "sueldo_base": 2736.0,
            "horas_extra": 684.0,
            "total_desembolsar": 3420.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Descuento temporal",
            "tipo": "deduccion",
            "monto": 50.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Eliminar el rubro
        response = client.delete(f"/api/rubros/{rubro_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Rubro eliminado"

        # Verificar que ya no aparece en la lista
        list_response = client.get("/api/rubros/", headers=auth_headers)
        rubro_ids = [r["id_rubro"] for r in list_response.json]
        assert rubro_id not in rubro_ids

    def test_crear_rubro_monto_por_defecto(self, client, auth_headers, cargo_fixture):
        """Test: Crear rubro sin especificar monto (debe ser 0.0)"""
        # Crear empleado
        empleado_data = {
            "nombre": "Ignacio",
            "apellido": "Herrera",
            "email": "ignacio.herrera@test.com",
            "telefono": "888999000",
            "direccion": "Zona Este",
            "fecha_nacimiento": "1986-06-06",
            "fecha_contratacion": "2016-12-12",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-07",
            "sueldo_base": 3024.0,
            "horas_extra": 756.0,
            "total_desembolsar": 3780.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro sin monto
        rubro_data = {
            "id_nomina": nomina_id,
            "motivo": "Rubro pendiente de definir",
            "tipo": "devengo"
        }
        response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        
        assert response.status_code == 201
        rubro_id = response.json["id"]

        # Verificar que el monto es 0.0
        get_response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        assert get_response.json["monto"] == 0.0

    def test_multiples_rubros_misma_nomina(self, client, auth_headers, cargo_fixture):
        """Test: Crear múltiples rubros para la misma nómina"""
        # Crear empleado
        empleado_data = {
            "nombre": "Julia",
            "apellido": "Ramos",
            "email": "julia.ramos@test.com",
            "telefono": "111444777",
            "direccion": "Residencial Norte",
            "fecha_nacimiento": "1994-02-02",
            "fecha_contratacion": "2022-05-05",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "mes": "2024-08",
            "sueldo_base": 4480.0,
            "horas_extra": 1120.0,
            "total_desembolsar": 5600.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear varios rubros
        rubros = [
            {"motivo": "Salario base", "tipo": "devengo", "monto": 5000.0},
            {"motivo": "Horas extra", "tipo": "devengo", "monto": 1000.0},
            {"motivo": "Bonificación", "tipo": "devengo", "monto": 1000.0},
            {"motivo": "Impuesto", "tipo": "deduccion", "monto": 700.0},
            {"motivo": "Seguro", "tipo": "deduccion", "monto": 700.0}
        ]

        for rubro in rubros:
            rubro["id_nomina"] = nomina_id
            response = client.post("/api/rubros/", json=rubro, headers=auth_headers)
            assert response.status_code == 201

        # Verificar que todos se crearon
        list_response = client.get(f"/api/rubros/?id_nomina={nomina_id}", headers=auth_headers)
        assert len(list_response.json) == 5

