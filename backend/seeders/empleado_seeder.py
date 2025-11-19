from seeders.base_seeder import Seeder, app
from extensions import db
from models.empleado import Empleado
from models.cargo import Cargo
from datetime import date

class EmpleadoSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Empleados...")
            
            # Obtener cargos
            cargos = Cargo.query.all()
            if len(cargos) == 0:
                print("  No hay cargos disponibles. Ejecuta CargoSeeder primero.")
                return
            
            empleados = [
                Empleado(
                    nombres='Josue Fernando',
                    apellidos='Palma Zambrano',
                    cedula='0912345678',
                    fecha_nacimiento=date(1985, 3, 15),
                    fecha_ingreso=date(2020, 1, 10),
                    estado='activo',
                    id_cargo=cargos[0].id_cargo,
                    tipo_cuenta_bancaria='Ahorros',
                    numero_cuenta_bancaria='1234567890',
                    modalidad_fondo_reserva='Mensual',
                    modalidad_decimos='Mensual'
                ),
                Empleado(
                    nombres='Yimmi Leonel',
                    apellidos='Moreira Moreira',
                    cedula='0923456789',
                    fecha_nacimiento=date(1990, 7, 22),
                    fecha_ingreso=date(2021, 3, 15),
                    estado='activo',
                    id_cargo=cargos[1].id_cargo if len(cargos) > 1 else cargos[0].id_cargo,
                    tipo_cuenta_bancaria='Corriente',
                    numero_cuenta_bancaria='2345678901',
                    modalidad_fondo_reserva='Acumulado',
                    modalidad_decimos='Mensual'
                ),
                Empleado(
                    nombres='Marcelo Matias',
                    apellidos='Nieto Medina',
                    cedula='0934567890',
                    fecha_nacimiento=date(1988, 11, 5),
                    fecha_ingreso=date(2019, 6, 1),
                    estado='activo',
                    id_cargo=cargos[2].id_cargo if len(cargos) > 2 else cargos[0].id_cargo,
                    tipo_cuenta_bancaria='Ahorros',
                    numero_cuenta_bancaria='3456789012',
                    modalidad_fondo_reserva='Mensual',
                    modalidad_decimos='Acumulado'
                ),
                Empleado(
                    nombres='James Malony',
                    apellidos='Molina Bravo',
                    cedula='0945678901',
                    fecha_nacimiento=date(1995, 2, 18),
                    fecha_ingreso=date(2022, 1, 5),
                    estado='activo',
                    id_cargo=cargos[3].id_cargo if len(cargos) > 3 else cargos[0].id_cargo,
                    tipo_cuenta_bancaria='Ahorros',
                    numero_cuenta_bancaria='4567890123',
                    modalidad_fondo_reserva='Mensual',
                    modalidad_decimos='Mensual'
                ),
                Empleado(
                    nombres='Alex Sahid',
                    apellidos='Triviño Hidalgo',
                    cedula='0956789012',
                    fecha_nacimiento=date(1992, 9, 30),
                    fecha_ingreso=date(2021, 8, 20),
                    estado='activo',
                    id_cargo=cargos[4].id_cargo if len(cargos) > 4 else cargos[0].id_cargo,
                    tipo_cuenta_bancaria='Ahorros',
                    numero_cuenta_bancaria='5678901234',
                    modalidad_fondo_reserva='Mensual',
                    modalidad_decimos='Mensual'
                ),
            ]
            
            for empleado in empleados:
                existing = Empleado.query.filter_by(cedula=empleado.cedula).first()
                if not existing:
                    db.session.add(empleado)
                    print(f"  Empleado '{empleado.nombres} {empleado.apellidos}' creado")
                else:
                    print(f"  Empleado con cédula '{empleado.cedula}' ya existe")
            
            db.session.commit()
            print(f"Empleados: {Empleado.query.count()} registros\n")
