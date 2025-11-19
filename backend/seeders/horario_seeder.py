from seeders.base_seeder import Seeder, app
from extensions import db
from models.horario import Horario
from models.empleado import Empleado
from datetime import date, time

class HorarioSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Horarios...")
            
            empleados = Empleado.query.limit(4).all()
            if len(empleados) == 0:
                print("  No hay empleados disponibles. Ejecuta EmpleadoSeeder primero.")
                return
            
            horarios = [
                Horario(
                    id_empleado=empleados[0].id,
                    dia_laborables='Lunes a Viernes',
                    fecha_inicio=date(2020, 1, 10),
                    hora_entrada=time(8, 0),
                    hora_salida=time(17, 0),
                    descanso_minutos=60,
                    turno='matutino',
                    inicio_vigencia=date(2020, 1, 10),
                    fin_vigencia=None
                ),
                Horario(
                    id_empleado=empleados[1].id if len(empleados) > 1 else empleados[0].id,
                    dia_laborables='Lunes a Viernes',
                    fecha_inicio=date(2021, 3, 15),
                    hora_entrada=time(8, 30),
                    hora_salida=time(17, 30),
                    descanso_minutos=60,
                    turno='matutino',
                    inicio_vigencia=date(2021, 3, 15),
                    fin_vigencia=None
                ),
                Horario(
                    id_empleado=empleados[2].id if len(empleados) > 2 else empleados[0].id,
                    dia_laborables='Lunes a Sábado',
                    fecha_inicio=date(2022, 1, 5),
                    hora_entrada=time(9, 0),
                    hora_salida=time(18, 0),
                    descanso_minutos=60,
                    turno='matutino',
                    inicio_vigencia=date(2022, 1, 5),
                    fin_vigencia=None
                ),
            ]
            
            db.session.add_all(horarios)
            db.session.commit()
            print(f"Horarios: {Horario.query.count()} registros\n")
