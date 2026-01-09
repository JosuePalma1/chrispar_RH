"""
Locust Performance Testing Configuration
Tests de carga y performance para el sistema de RRHH ChrisPar

Uso:
    locust -f locustfile.py --host=http://localhost:5000
    locust -f locustfile.py --host=http://localhost:5000 --users 50 --spawn-rate 5 --run-time 2m
"""
from locust import HttpUser, task, between, SequentialTaskSet
import json
import random
from datetime import date, timedelta


class AuthenticatedTaskSet(SequentialTaskSet):
    """Base class para tasks que requieren autenticación"""
    
    def on_start(self):
        """Setup: Login y obtener token"""
        response = self.client.post(
            "/api/usuarios/login",
            json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}


class EmployeeManagementTasks(AuthenticatedTaskSet):
    """Tareas de gestión de empleados"""
    
    @task(10)
    def list_employees(self):
        """Listar todos los empleados (operación más frecuente)"""
        self.client.get("/api/empleados/", headers=self.headers)
    
    @task(5)
    def get_employee_details(self):
        """Obtener detalles de un empleado específico"""
        # Simular acceso a diferentes IDs
        employee_id = random.randint(1, 20)
        self.client.get(f"/api/empleados/{employee_id}", headers=self.headers)
    
    @task(3)
    def filter_active_employees(self):
        """Filtrar empleados activos"""
        self.client.get("/api/empleados/?estado=activo", headers=self.headers)
    
    @task(2)
    def create_employee(self):
        """Crear nuevo empleado"""
        random_id = random.randint(1000, 9999)
        response = self.client.post(
            "/api/empleados/",
            json={
                "id_cargo": 1,
                "nombres": f"Empleado{random_id}",
                "apellidos": f"Test{random_id}",
                "cedula": f"09{random_id:08d}",
                "fecha_nacimiento": "1990-01-01",
                "fecha_ingreso": date.today().isoformat(),
                "estado": "activo",
                "tipo_cuenta_bancaria": "Ahorros",
                "numero_cuenta_bancaria": f"{random_id:010d}"
            },
            headers=self.headers,
            name="/api/empleados/ [CREATE]"
        )
        
        # Si se crea exitosamente, guardar el ID para posible uso posterior
        if response.status_code == 201:
            self.created_employee_id = response.json().get("id")
    
    @task(1)
    def update_employee(self):
        """Actualizar datos de empleado"""
        if hasattr(self, 'created_employee_id'):
            self.client.put(
                f"/api/empleados/{self.created_employee_id}",
                json={"estado": random.choice(["activo", "inactivo"])},
                headers=self.headers,
                name="/api/empleados/{id} [UPDATE]"
            )


class AttendanceManagementTasks(AuthenticatedTaskSet):
    """Tareas de gestión de asistencias"""
    
    @task(8)
    def list_today_attendance(self):
        """Listar asistencias del día"""
        today = date.today().isoformat()
        self.client.get(f"/api/asistencias/?fecha={today}", headers=self.headers)
    
    @task(5)
    def register_attendance(self):
        """Registrar asistencia de empleado"""
        self.client.post(
            "/api/asistencias/",
            json={
                "id_empleado": random.randint(1, 10),
                "fecha": date.today().isoformat(),
                "hora_entrada": "08:00",
                "estado": "presente"
            },
            headers=self.headers,
            name="/api/asistencias/ [CREATE]"
        )
    
    @task(3)
    def get_employee_attendance_history(self):
        """Consultar histórico de asistencias de un empleado"""
        employee_id = random.randint(1, 10)
        self.client.get(f"/api/asistencias/empleado/{employee_id}", headers=self.headers)


class PayrollManagementTasks(AuthenticatedTaskSet):
    """Tareas de gestión de nóminas"""
    
    @task(5)
    def list_current_month_payroll(self):
        """Listar nóminas del mes actual"""
        current_month = date.today().month
        current_year = date.today().year
        self.client.get(
            f"/api/nominas/?mes={current_month}&anio={current_year}",
            headers=self.headers
        )
    
    @task(3)
    def get_payroll_details(self):
        """Obtener detalles de una nómina"""
        payroll_id = random.randint(1, 20)
        self.client.get(f"/api/nominas/{payroll_id}", headers=self.headers)
    
    @task(2)
    def create_payroll_with_items(self):
        """Crear nómina con rubros (operación pesada)"""
        # Crear nómina
        response = self.client.post(
            "/api/nominas/",
            json={
                "id_empleado": random.randint(1, 10),
                "mes": date.today().month,
                "anio": date.today().year,
                "total_devengado": 0,
                "total_deducido": 0,
                "neto_pagar": 0
            },
            headers=self.headers,
            name="/api/nominas/ [CREATE]"
        )
        
        # Si se crea exitosamente, agregar rubros
        if response.status_code == 201:
            nomina_id = response.json().get("id")
            
            # Agregar rubro de devengo
            self.client.post(
                "/api/rubros/",
                json={
                    "id_nomina": nomina_id,
                    "nombre": "Sueldo Base",
                    "tipo": "devengo",
                    "monto": 1000.00
                },
                headers=self.headers,
                name="/api/rubros/ [CREATE - Devengo]"
            )
            
            # Agregar rubro de deducción
            self.client.post(
                "/api/rubros/",
                json={
                    "id_nomina": nomina_id,
                    "nombre": "IESS",
                    "tipo": "deducción",
                    "monto": 94.50
                },
                headers=self.headers,
                name="/api/rubros/ [CREATE - Deducción]"
            )


class PermissionManagementTasks(AuthenticatedTaskSet):
    """Tareas de gestión de permisos"""
    
    @task(7)
    def list_pending_permissions(self):
        """Listar permisos pendientes"""
        self.client.get("/api/permisos/?estado=pendiente", headers=self.headers)
    
    @task(5)
    def list_all_permissions(self):
        """Listar todos los permisos"""
        self.client.get("/api/permisos/", headers=self.headers)
    
    @task(3)
    def request_permission(self):
        """Solicitar permiso"""
        fecha_inicio = (date.today() + timedelta(days=random.randint(5, 15))).isoformat()
        fecha_fin = (date.today() + timedelta(days=random.randint(16, 20))).isoformat()
        
        self.client.post(
            "/api/permisos/",
            json={
                "id_empleado": random.randint(1, 10),
                "tipo": random.choice(["permiso", "vacaciones", "licencia"]),
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "motivo": "Solicitud de prueba de carga",
                "estado": "pendiente"
            },
            headers=self.headers,
            name="/api/permisos/ [CREATE]"
        )


class AuditLogTasks(AuthenticatedTaskSet):
    """Tareas de consulta de logs transaccionales"""
    
    @task(10)
    def list_recent_logs(self):
        """Listar logs recientes (operación más frecuente en auditoría)"""
        self.client.get("/api/logs/?per_page=20", headers=self.headers)
    
    @task(5)
    def filter_logs_by_table(self):
        """Filtrar logs por tabla"""
        tabla = random.choice(["empleados", "cargos", "nominas", "asistencias"])
        self.client.get(f"/api/logs/?tabla={tabla}", headers=self.headers)
    
    @task(3)
    def filter_logs_by_operation(self):
        """Filtrar logs por operación"""
        operacion = random.choice(["INSERT", "UPDATE", "DELETE"])
        self.client.get(f"/api/logs/?operacion={operacion}", headers=self.headers)
    
    @task(2)
    def filter_logs_by_date_range(self):
        """Filtrar logs por rango de fechas (operación pesada)"""
        fecha_desde = (date.today() - timedelta(days=7)).isoformat()
        fecha_hasta = date.today().isoformat()
        self.client.get(
            f"/api/logs/?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}",
            headers=self.headers,
            name="/api/logs/ [DATE RANGE]"
        )


class DashboardTasks(AuthenticatedTaskSet):
    """Tareas de dashboard (operaciones pesadas con agregaciones)"""
    
    @task(10)
    def get_dashboard_stats(self):
        """Obtener estadísticas del dashboard"""
        self.client.get("/api/dashboard/estadisticas", headers=self.headers)
    
    @task(5)
    def get_monthly_attendance_report(self):
        """Reporte mensual de asistencias"""
        # Simular consulta de reporte pesado
        self.client.get("/api/asistencias/", headers=self.headers)


# === User Classes (diferentes perfiles de usuario) ===

class AdminUser(HttpUser):
    """Usuario administrador con acceso completo"""
    wait_time = between(1, 3)
    weight = 1
    tasks = [
        EmployeeManagementTasks,
        PayrollManagementTasks,
        AuditLogTasks,
        DashboardTasks
    ]


class ManagerUser(HttpUser):
    """Usuario gerente con foco en reportes y aprobaciones"""
    wait_time = between(2, 4)
    weight = 2
    tasks = [
        PermissionManagementTasks,
        AttendanceManagementTasks,
        DashboardTasks
    ]


class HRUser(HttpUser):
    """Usuario de RRHH con foco en empleados y nóminas"""
    wait_time = between(1, 3)
    weight = 3
    tasks = [
        EmployeeManagementTasks,
        PayrollManagementTasks,
        AttendanceManagementTasks
    ]


class AuditorUser(HttpUser):
    """Usuario auditor con foco en logs"""
    wait_time = between(2, 5)
    weight = 1
    tasks = [AuditLogTasks]


class ReadOnlyUser(HttpUser):
    """Usuario de solo lectura (consultas)"""
    wait_time = between(1, 2)
    weight = 5
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.headers = {}
    
    def on_start(self):
        """Login una sola vez"""
        response = self.client.post(
            "/api/usuarios/login",
            json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(10)
    def read_employees(self):
        """Solo leer empleados"""
        self.client.get("/api/empleados/", headers=self.headers)
    
    @task(5)
    def read_attendance(self):
        """Solo leer asistencias"""
        self.client.get("/api/asistencias/", headers=self.headers)
    
    @task(3)
    def read_dashboard(self):
        """Solo leer dashboard"""
        self.client.get("/api/dashboard/estadisticas", headers=self.headers)
