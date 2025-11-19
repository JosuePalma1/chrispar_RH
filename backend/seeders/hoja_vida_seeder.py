from seeders.base_seeder import Seeder, app
from extensions import db
from models.hoja_vida import Hoja_Vida
from models.empleado import Empleado
from datetime import date

class HojaVidaSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Hojas de Vida...")
            
            empleados = Empleado.query.limit(4).all()
            if len(empleados) == 0:
                print("  No hay empleados disponibles. Ejecuta EmpleadoSeeder primero.")
                return
            
            hojas_vida = [
                Hoja_Vida(
                    id_empleado=empleados[0].id,
                    tipo='Título',
                    nombre_documento='Licenciatura en Administración',
                    institucion='Universidad Estatal',
                    fecha_inicio=date(2003, 9, 1),
                    fecha_finalizacion=date(2008, 6, 30),
                    ruta_archivo_url='/docs/titulo_admin.pdf'
                ),
                Hoja_Vida(
                    id_empleado=empleados[1].id if len(empleados) > 1 else empleados[0].id,
                    tipo='Maestría',
                    nombre_documento='Maestría en Recursos Humanos',
                    institucion='Universidad Central',
                    fecha_inicio=date(2015, 9, 1),
                    fecha_finalizacion=date(2017, 6, 30),
                    ruta_archivo_url='/docs/maestria_rrhh.pdf'
                ),
                Hoja_Vida(
                    id_empleado=empleados[2].id if len(empleados) > 2 else empleados[0].id,
                    tipo='Curso',
                    nombre_documento='Certificación Contable Internacional',
                    institucion='Instituto de Contadores',
                    fecha_inicio=date(2018, 3, 1),
                    fecha_finalizacion=date(2018, 6, 30),
                    ruta_archivo_url='/docs/cert_contable.pdf'
                ),
            ]
            
            db.session.add_all(hojas_vida)
            db.session.commit()
            print(f"Hojas de Vida: {Hoja_Vida.query.count()} registros\n")
