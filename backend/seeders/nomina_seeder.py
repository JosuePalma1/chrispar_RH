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
                    mes='2024-11',
                    fecha_generacion=date(2024, 11, 1),
                    sueldo_base=2400.00,
                    horas_extra=100.00,
                    total_desembolsar=2500.00
                ),
                Nomina(
                    id_empleado=empleados[1].id if len(empleados) > 1 else empleados[0].id,
                    mes='2024-11',
                    fecha_generacion=date(2024, 11, 1),
                    sueldo_base=1650.00,
                    horas_extra=150.00,
                    total_desembolsar=1800.00
                ),
                Nomina(
                    id_empleado=empleados[2].id if len(empleados) > 2 else empleados[0].id,
                    mes='2024-11',
                    fecha_generacion=date(2024, 11, 1),
                    sueldo_base=1400.00,
                    horas_extra=100.00,
                    total_desembolsar=1500.00
                ),
            ]
            
            db.session.add_all(nominas)
            db.session.commit()
            print(f"Nominas: {Nomina.query.count()} registros\n")
