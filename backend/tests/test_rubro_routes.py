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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 5000.0,
            "deducciones": 500.0,
            "salario_neto": 4500.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DEV001",
            "descripcion": "Bono de productividad",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 4000.0,
            "deducciones": 800.0,
            "salario_neto": 3200.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro deducción
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DED001",
            "descripcion": "Descuento préstamo",
            "tipo": "deduccion",
            "monto": 200.0
        }
        response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "id" in response.json

    def test_crear_rubro_sin_nomina(self, client, auth_headers):
        """Test: Validar que se requiere id_nomina"""
        rubro_data = {
            "codigo": "DEV002",
            "descripcion": "Bono sin nómina",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 6000.0,
            "deducciones": 600.0,
            "salario_neto": 5400.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubros
        rubro1_data = {
            "id_nomina": nomina_id,
            "codigo": "DEV003",
            "descripcion": "Horas extra",
            "tipo": "devengo",
            "monto": 250.0
        }
        client.post("/api/rubros/", json=rubro1_data, headers=auth_headers)

        rubro2_data = {
            "id_nomina": nomina_id,
            "codigo": "DED002",
            "descripcion": "Seguro médico",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 3500.0,
            "deducciones": 350.0,
            "salario_neto": 3150.0
        }
        nomina1_response = client.post("/api/nominas/", json=nomina1_data, headers=auth_headers)
        nomina1_id = nomina1_response.json["id"]

        nomina2_data = {
            "id_empleado": empleado_id,
            "fecha_inicio": str(date.today() + timedelta(days=31)),
            "fecha_fin": str(date.today() + timedelta(days=60)),
            "salario_bruto": 3500.0,
            "deducciones": 350.0,
            "salario_neto": 3150.0
        }
        nomina2_response = client.post("/api/nominas/", json=nomina2_data, headers=auth_headers)
        nomina2_id = nomina2_response.json["id"]

        # Crear rubros para cada nómina
        rubro1_data = {
            "id_nomina": nomina1_id,
            "codigo": "DEV004",
            "descripcion": "Bono mes 1",
            "tipo": "devengo",
            "monto": 200.0
        }
        client.post("/api/rubros/", json=rubro1_data, headers=auth_headers)

        rubro2_data = {
            "id_nomina": nomina2_id,
            "codigo": "DEV005",
            "descripcion": "Bono mes 2",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 4500.0,
            "deducciones": 450.0,
            "salario_neto": 4050.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DEV006",
            "descripcion": "Comisión por ventas",
            "tipo": "devengo",
            "monto": 500.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Obtener el rubro
        response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["id_rubro"] == rubro_id
        assert response.json["codigo"] == "DEV006"
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 5500.0,
            "deducciones": 550.0,
            "salario_neto": 4950.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DED003",
            "descripcion": "Descuento provisional",
            "tipo": "deduccion",
            "monto": 100.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Actualizar el rubro
        update_data = {
            "monto": 150.0,
            "descripcion": "Descuento revisado"
        }
        response = client.put(f"/api/rubros/{rubro_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Rubro actualizado"

        # Verificar actualización
        get_response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        assert get_response.json["monto"] == 150.0
        assert get_response.json["descripcion"] == "Descuento revisado"

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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 4800.0,
            "deducciones": 480.0,
            "salario_neto": 4320.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DEV007",
            "descripcion": "Bono inicial",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 3800.0,
            "deducciones": 380.0,
            "salario_neto": 3420.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DED004",
            "descripcion": "Descuento temporal",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 4200.0,
            "deducciones": 420.0,
            "salario_neto": 3780.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro sin monto
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DEV008",
            "descripcion": "Rubro pendiente de definir",
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
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 7000.0,
            "deducciones": 1400.0,
            "salario_neto": 5600.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear varios rubros
        rubros = [
            {"codigo": "DEV009", "descripcion": "Salario base", "tipo": "devengo", "monto": 5000.0},
            {"codigo": "DEV010", "descripcion": "Horas extra", "tipo": "devengo", "monto": 1000.0},
            {"codigo": "DEV011", "descripcion": "Bonificación", "tipo": "devengo", "monto": 1000.0},
            {"codigo": "DED005", "descripcion": "Impuesto", "tipo": "deduccion", "monto": 700.0},
            {"codigo": "DED006", "descripcion": "Seguro", "tipo": "deduccion", "monto": 700.0}
        ]

        for rubro in rubros:
            rubro["id_nomina"] = nomina_id
            response = client.post("/api/rubros/", json=rubro, headers=auth_headers)
            assert response.status_code == 201

        # Verificar que todos se crearon
        list_response = client.get(f"/api/rubros/?id_nomina={nomina_id}", headers=auth_headers)
        assert len(list_response.json) == 5

    def test_actualizar_rubro_codigo(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar el código de un rubro"""
        # Crear empleado
        empleado_data = {
            "nombre": "Kevin",
            "apellido": "Luna",
            "email": "kevin.luna@test.com",
            "telefono": "222555888",
            "direccion": "Calle Nueva",
            "fecha_nacimiento": "1990-10-10",
            "fecha_contratacion": "2020-07-07",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear nómina
        nomina_data = {
            "id_empleado": empleado_id,
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(date.today() + timedelta(days=30)),
            "salario_bruto": 5200.0,
            "deducciones": 520.0,
            "salario_neto": 4680.0
        }
        nomina_response = client.post("/api/nominas/", json=nomina_data, headers=auth_headers)
        nomina_id = nomina_response.json["id"]

        # Crear rubro
        rubro_data = {
            "id_nomina": nomina_id,
            "codigo": "DEV999",
            "descripcion": "Bono temporal",
            "tipo": "devengo",
            "monto": 400.0
        }
        create_response = client.post("/api/rubros/", json=rubro_data, headers=auth_headers)
        rubro_id = create_response.json["id"]

        # Actualizar código
        update_data = {
            "codigo": "DEV012"
        }
        response = client.put(f"/api/rubros/{rubro_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200

        # Verificar actualización
        get_response = client.get(f"/api/rubros/{rubro_id}", headers=auth_headers)
        assert get_response.json["codigo"] == "DEV012"

