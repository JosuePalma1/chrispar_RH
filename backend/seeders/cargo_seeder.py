from seeders.base_seeder import Seeder, app
from extensions import db
from models.cargo import Cargo

class CargoSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Cargos...")
            
            cargos = [
                Cargo(nombre_cargo='Gerente General', sueldo_base=2500),
                Cargo(nombre_cargo='Jefe de RRHH', sueldo_base=1800),
                Cargo(nombre_cargo='Contador', sueldo_base=1500),
                Cargo(nombre_cargo='Vendedor', sueldo_base=500),
                Cargo(nombre_cargo='Cajero', sueldo_base=550),
                Cargo(nombre_cargo='Bodeguero', sueldo_base=650),
                Cargo(nombre_cargo='Auxiliar Contable', sueldo_base=700),
                Cargo(nombre_cargo='Supervisor de Ventas', sueldo_base=1200),
            ]
            
            for cargo in cargos:
                existing = Cargo.query.filter_by(nombre_cargo=cargo.nombre_cargo).first()
                if not existing:
                    db.session.add(cargo)
                    print(f"  Cargo '{cargo.nombre_cargo}' creado")
                else:
                    print(f"  Cargo '{cargo.nombre_cargo}' ya existe")
            
            db.session.commit()
            print(f"Cargos: {Cargo.query.count()} registros\n")
