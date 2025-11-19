from seeders.base_seeder import Seeder, app
from extensions import db
from models.asistencia import Asistencia
from models.empleado import Empleado
from datetime import date, time, timedelta

class AsistenciaSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Asistencias...")
            
            empleados = Empleado.query.limit(4).all()
            if len(empleados) == 0:
                print("  No hay empleados disponibles. Ejecuta EmpleadoSeeder primero.")
                return
            
            asistencias = []
            hoy = date.today()
            
            # Crear asistencias para los últimos 7 días
            for i in range(7):
                fecha_asistencia = hoy - timedelta(days=i)
                for empleado in empleados:
                    asistencias.append(
                        Asistencia(
                            id_empleado=empleado.id,
                            fecha=fecha_asistencia,
                            hora_entrada=time(8, 0 + (i % 3) * 5),
                            hora_salida=time(17, 0 + (i % 2) * 10),
                            horas_extra=0.5 if i % 3 == 0 else 0.0
                        )
                    )
            
            db.session.add_all(asistencias)
            db.session.commit()
            print(f"Asistencias: {Asistencia.query.count()} registros\n")
