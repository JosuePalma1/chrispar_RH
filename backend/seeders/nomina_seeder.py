from seeders.base_seeder import Seeder, app
from extensions import db
from models.nomina import Nomina
from models.empleado import Empleado
from datetime import date

class NominaSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Nominas...")
            
            empleados = Empleado.query.limit(3).all()
            if len(empleados) == 0:
                print("  No hay empleados disponibles. Ejecuta EmpleadoSeeder primero.")
                return
            
            nominas = [
                Nomina(
                    id_empleado=empleados[0].id,
                    fecha_inicio=date(2024, 11, 1),
                    fecha_fin=date(2024, 11, 30),
                    total=2500.00,
                    estado='pagado'
                ),
                Nomina(
                    id_empleado=empleados[1].id if len(empleados) > 1 else empleados[0].id,
                    fecha_inicio=date(2024, 11, 1),
                    fecha_fin=date(2024, 11, 30),
                    total=1800.00,
                    estado='pagado'
                ),
                Nomina(
                    id_empleado=empleados[2].id if len(empleados) > 2 else empleados[0].id,
                    fecha_inicio=date(2024, 11, 1),
                    fecha_fin=date(2024, 11, 30),
                    total=1500.00,
                    estado='pendiente'
                ),
            ]
            
            db.session.add_all(nominas)
            db.session.commit()
            print(f"Nominas: {Nomina.query.count()} registros\n")
