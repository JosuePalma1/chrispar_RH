"""
Tests de Integración para Hojas de Vida
Pruebas para CRUD completo y validaciones de hojas de vida de empleados
"""
import pytest
from datetime import date, timedelta


@pytest.mark.integration
class TestHojaVidaRoutes:
    """Tests para los endpoints de hojas de vida"""

    def test_crear_hoja_vida_academica(self, client, auth_headers, cargo_fixture):
        """Test: Crear una hoja de vida tipo académica"""
        # Crear empleado
        empleado_data = {
            "nombre": "Gabriela",
            "apellido": "Paredes",
            "email": "gabriela.paredes@test.com",
            "telefono": "111222333",
            "direccion": "Calle Universidad",
            "fecha_nacimiento": "1992-05-15",
            "fecha_contratacion": "2020-01-01",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida académica
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "academica",
            "nombre_documento": "Licenciatura en Ingeniería",
            "institucion": "Universidad Nacional",
            "fecha_inicio": "2010-01-01",
            "fecha_finalizacion": "2015-12-31",
            "ruta_archivo_url": "/documentos/titulo_gabriela.pdf"
        }
        response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "hoja_vida" in response.json
        assert response.json["mensaje"] == "Hoja de Vida creada exitosamente"

    def test_crear_hoja_vida_laboral(self, client, auth_headers, cargo_fixture):
        """Test: Crear una hoja de vida tipo experiencia laboral"""
        # Crear empleado
        empleado_data = {
            "nombre": "Héctor",
            "apellido": "Silva",
            "email": "hector.silva@test.com",
            "telefono": "444555666",
            "direccion": "Avenida Trabajo",
            "fecha_nacimiento": "1988-03-20",
            "fecha_contratacion": "2019-06-15",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear experiencia laboral
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "laboral",
            "nombre_documento": "Gerente de Proyectos",
            "institucion": "Tech Solutions S.A.",
            "fecha_inicio": "2015-03-01",
            "fecha_finalizacion": "2019-05-31",
            "ruta_archivo_url": "/documentos/carta_recomendacion.pdf"
        }
        response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert response.json["hoja_vida"]["tipo"] == "laboral"

    def test_crear_hoja_vida_sin_empleado(self, client, auth_headers):
        """Test: Validar que se requiere id_empleado"""
        hoja_vida_data = {
            "tipo": "academica",
            "nombre_documento": "Título sin empleado",
            "institucion": "Universidad Test"
        }
        response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "id_empleado" in response.json["error"].lower()

    def test_listar_hojas_vida(self, client, auth_headers, cargo_fixture):
        """Test: Listar todas las hojas de vida"""
        # Crear empleado
        empleado_data = {
            "nombre": "Irene",
            "apellido": "Campos",
            "email": "irene.campos@test.com",
            "telefono": "777888999",
            "direccion": "Plaza Central",
            "fecha_nacimiento": "1990-11-11",
            "fecha_contratacion": "2018-09-20",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "certificacion",
            "nombre_documento": "Certificación PMP",
            "institucion": "PMI",
            "fecha_inicio": "2020-01-01",
            "fecha_finalizacion": "2020-06-30"
        }
        client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)

        # Listar hojas de vida
        response = client.get("/api/hojas-vida/", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) > 0

    def test_listar_hojas_vida_filtrado_por_empleado(self, client, auth_headers, cargo_fixture):
        """Test: Filtrar hojas de vida por id_empleado"""
        # Crear dos empleados
        empleado1_data = {
            "nombre": "Jorge",
            "apellido": "Mendez",
            "email": "jorge.mendez@test.com",
            "telefono": "333444555",
            "direccion": "Sector Norte",
            "fecha_nacimiento": "1987-07-07",
            "fecha_contratacion": "2017-05-05",
            "id_cargo": cargo_fixture
        }
        emp1_response = client.post("/api/empleados/", json=empleado1_data, headers=auth_headers)
        empleado1_id = emp1_response.json["id"]

        empleado2_data = {
            "nombre": "Karina",
            "apellido": "Rojas",
            "email": "karina.rojas@test.com",
            "telefono": "666777888",
            "direccion": "Sector Sur",
            "fecha_nacimiento": "1993-04-04",
            "fecha_contratacion": "2021-08-08",
            "id_cargo": cargo_fixture
        }
        emp2_response = client.post("/api/empleados/", json=empleado2_data, headers=auth_headers)
        empleado2_id = emp2_response.json["id"]

        # Crear hojas de vida para cada empleado
        hoja1_data = {
            "id_empleado": empleado1_id,
            "tipo": "academica",
            "nombre_documento": "Maestría en Administración",
            "institucion": "Universidad Central"
        }
        client.post("/api/hojas-vida/", json=hoja1_data, headers=auth_headers)

        hoja2_data = {
            "id_empleado": empleado2_id,
            "tipo": "academica",
            "nombre_documento": "Licenciatura en Contabilidad",
            "institucion": "Universidad del Sur"
        }
        client.post("/api/hojas-vida/", json=hoja2_data, headers=auth_headers)

        # Filtrar hojas de vida del empleado 1
        response = client.get(f"/api/hojas-vida/?id_empleado={empleado1_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json, list)
        # Verificar que todas las hojas correspondan al empleado 1
        for hoja in response.json:
            assert hoja["id_empleado"] == empleado1_id

    def test_obtener_hoja_vida_por_id(self, client, auth_headers, cargo_fixture):
        """Test: Obtener una hoja de vida específica por ID"""
        # Crear empleado
        empleado_data = {
            "nombre": "Leonardo",
            "apellido": "Vega",
            "email": "leonardo.vega@test.com",
            "telefono": "999000111",
            "direccion": "Urbanización Este",
            "fecha_nacimiento": "1985-12-12",
            "fecha_contratacion": "2016-04-04",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "curso",
            "nombre_documento": "Curso de Python Avanzado",
            "institucion": "Platzi",
            "fecha_inicio": "2022-01-01",
            "fecha_finalizacion": "2022-03-31"
        }
        create_response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        hoja_vida_id = create_response.json["hoja_vida"]["id_hoja_vida"]

        # Obtener la hoja de vida
        response = client.get(f"/api/hojas-vida/{hoja_vida_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["id_hoja_vida"] == hoja_vida_id
        assert response.json["tipo"] == "curso"

    def test_actualizar_hoja_vida(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar una hoja de vida existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Mónica",
            "apellido": "Ortiz",
            "email": "monica.ortiz@test.com",
            "telefono": "222333444",
            "direccion": "Centro",
            "fecha_nacimiento": "1991-09-09",
            "fecha_contratacion": "2019-11-11",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "academica",
            "nombre_documento": "En curso - MBA",
            "institucion": "Universidad Empresarial",
            "fecha_inicio": "2023-01-01"
        }
        create_response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        hoja_vida_id = create_response.json["hoja_vida"]["id_hoja_vida"]

        # Actualizar la hoja de vida (completar estudios)
        update_data = {
            "nombre_documento": "MBA - Completado",
            "fecha_finalizacion": "2024-12-31"
        }
        response = client.put(f"/api/hojas-vida/{hoja_vida_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Registro de Hoja de Vida actualizado exitosamente"

        # Verificar actualización
        get_response = client.get(f"/api/hojas-vida/{hoja_vida_id}", headers=auth_headers)
        assert "Completado" in get_response.json["nombre_documento"]
        assert get_response.json["fecha_finalizacion"] == "2024-12-31"

    def test_eliminar_hoja_vida(self, client, auth_headers, cargo_fixture):
        """Test: Eliminar una hoja de vida existente"""
        # Crear empleado
        empleado_data = {
            "nombre": "Nicolás",
            "apellido": "Castro",
            "email": "nicolas.castro@test.com",
            "telefono": "555666777",
            "direccion": "Barrio Oeste",
            "fecha_nacimiento": "1989-02-02",
            "fecha_contratacion": "2018-10-10",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "curso",
            "nombre_documento": "Curso temporal",
            "institucion": "Instituto Test"
        }
        create_response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        hoja_vida_id = create_response.json["hoja_vida"]["id_hoja_vida"]

        # Eliminar la hoja de vida
        response = client.delete(f"/api/hojas-vida/{hoja_vida_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json["mensaje"] == "Registro de Hoja de Vida y archivo eliminados exitosamente"

        # Verificar que ya no aparece en la lista
        list_response = client.get("/api/hojas-vida/", headers=auth_headers)
        hoja_vida_ids = [h["id_hoja_vida"] for h in list_response.json]
        assert hoja_vida_id not in hoja_vida_ids

    def test_crear_hoja_vida_con_archivo(self, client, auth_headers, cargo_fixture):
        """Test: Crear hoja de vida con ruta de archivo"""
        # Crear empleado
        empleado_data = {
            "nombre": "Olivia",
            "apellido": "Herrera",
            "email": "olivia.herrera@test.com",
            "telefono": "888999000",
            "direccion": "Zona Residencial",
            "fecha_nacimiento": "1994-06-06",
            "fecha_contratacion": "2022-03-03",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida con archivo
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "certificacion",
            "nombre_documento": "AWS Certified Solutions Architect",
            "institucion": "Amazon Web Services",
            "fecha_inicio": "2023-01-01",
            "fecha_finalizacion": "2023-03-31",
            "ruta_archivo_url": "https://storage.example.com/certificates/aws_olivia.pdf"
        }
        response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        
        assert response.status_code == 201
        assert "ruta_archivo_url" in response.json["hoja_vida"]
        assert "https://" in response.json["hoja_vida"]["ruta_archivo_url"]

    def test_multiples_hojas_vida_mismo_empleado(self, client, auth_headers, cargo_fixture):
        """Test: Un empleado puede tener múltiples registros en su hoja de vida"""
        # Crear empleado
        empleado_data = {
            "nombre": "Pablo",
            "apellido": "Reyes",
            "email": "pablo.reyes@test.com",
            "telefono": "111444777",
            "direccion": "Avenida Principal",
            "fecha_nacimiento": "1986-08-08",
            "fecha_contratacion": "2016-12-12",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear múltiples registros
        registros = [
            {
                "tipo": "academica",
                "nombre_documento": "Licenciatura en Sistemas",
                "institucion": "Universidad Tecnológica",
                "fecha_inicio": "2004-01-01",
                "fecha_finalizacion": "2009-12-31"
            },
            {
                "tipo": "academica",
                "nombre_documento": "Maestría en Gestión TI",
                "institucion": "Universidad de Posgrado",
                "fecha_inicio": "2010-01-01",
                "fecha_finalizacion": "2012-12-31"
            },
            {
                "tipo": "laboral",
                "nombre_documento": "Analista de Sistemas",
                "institucion": "Tech Corp",
                "fecha_inicio": "2009-06-01",
                "fecha_finalizacion": "2013-12-31"
            },
            {
                "tipo": "laboral",
                "nombre_documento": "Líder Técnico",
                "institucion": "Innovation Inc",
                "fecha_inicio": "2014-01-01",
                "fecha_finalizacion": "2016-11-30"
            },
            {
                "tipo": "certificacion",
                "nombre_documento": "Scrum Master Certified",
                "institucion": "Scrum Alliance",
                "fecha_inicio": "2015-05-01",
                "fecha_finalizacion": "2015-06-30"
            }
        ]

        for registro in registros:
            registro["id_empleado"] = empleado_id
            response = client.post("/api/hojas-vida/", json=registro, headers=auth_headers)
            assert response.status_code == 201

        # Verificar que todos se crearon
        list_response = client.get(f"/api/hojas-vida/?id_empleado={empleado_id}", headers=auth_headers)
        assert len(list_response.json) == 5

    def test_actualizar_hoja_vida_institucion(self, client, auth_headers, cargo_fixture):
        """Test: Actualizar institución de una hoja de vida"""
        # Crear empleado
        empleado_data = {
            "nombre": "Quetzal",
            "apellido": "Morales",
            "email": "quetzal.morales@test.com",
            "telefono": "222555888",
            "direccion": "Colonia Nueva",
            "fecha_nacimiento": "1992-10-10",
            "fecha_contratacion": "2020-07-07",
            "id_cargo": cargo_fixture
        }
        emp_response = client.post("/api/empleados/", json=empleado_data, headers=auth_headers)
        empleado_id = emp_response.json["id"]

        # Crear hoja de vida
        hoja_vida_data = {
            "id_empleado": empleado_id,
            "tipo": "academica",
            "nombre_documento": "Diplomado en Marketing",
            "institucion": "Instituto de Marketing"
        }
        create_response = client.post("/api/hojas-vida/", json=hoja_vida_data, headers=auth_headers)
        hoja_vida_id = create_response.json["hoja_vida"]["id_hoja_vida"]

        # Actualizar institución
        update_data = {
            "institucion": "Universidad de Marketing Digital"
        }
        response = client.put(f"/api/hojas-vida/{hoja_vida_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200

        # Verificar actualización
        get_response = client.get(f"/api/hojas-vida/{hoja_vida_id}", headers=auth_headers)
        assert get_response.json["institucion"] == "Universidad de Marketing Digital"
