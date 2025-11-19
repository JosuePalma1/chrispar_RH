from seeders.base_seeder import Seeder, app
from extensions import db
from models.permiso import Permiso
from models.empleado import Empleado
from datetime import date, timedelta

class PermisoSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Permisos...")
            
            empleados = Empleado.query.limit(3).all()
            if len(empleados) == 0:
                print("  No hay empleados disponibles. Ejecuta EmpleadoSeeder primero.")
                return
            
            hoy = date.today()
            permisos = [
                Permiso(
                    id_empleado=empleados[0].id,
                    tipo='vacaciones',
                    descripcion='Vacaciones anuales',
                    fecha_inicio=date(2024, 12, 20),
                    fecha_fin=date(2024, 12, 31),
                    estado='aprobado',
                    autorizado_por='Gerente General'
                ),
                Permiso(
                    id_empleado=empleados[1].id if len(empleados) > 1 else empleados[0].id,
                    tipo='permiso',
                    descripcion='Cita médica',
                    fecha_inicio=hoy + timedelta(days=3),
                    fecha_fin=hoy + timedelta(days=3),
                    estado='pendiente',
                    autorizado_por=None
                ),
                Permiso(
                    id_empleado=empleados[2].id if len(empleados) > 2 else empleados[0].id,
                    tipo='licencia',
                    descripcion='Asuntos personales',
                    fecha_inicio=hoy - timedelta(days=2),
                    fecha_fin=hoy - timedelta(days=1),
                    estado='aprobado',
                    autorizado_por='Jefe de RRHH'
                ),
            ]
            
            db.session.add_all(permisos)
            db.session.commit()
            print(f"Permisos: {Permiso.query.count()} registros\n")
