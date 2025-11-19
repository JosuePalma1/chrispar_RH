from seeders.base_seeder import Seeder, app
from extensions import db
from models.rubro import Rubro
from models.nomina import Nomina

class RubroSeeder(Seeder):
    
    @staticmethod
    def run():
        with app.app_context():
            print("Seeding Rubros...")
            
            nominas = Nomina.query.limit(2).all()
            if len(nominas) == 0:
                print("  No hay nominas disponibles. Ejecuta NominaSeeder primero.")
                return
            
            rubros = [
                # Rubros para primera nómina
                Rubro(
                    id_nomina=nominas[0].id_nomina,
                    codigo='SUELDO',
                    descripcion='Sueldo base',
                    tipo='devengo',
                    monto=2500.00
                ),
                Rubro(
                    id_nomina=nominas[0].id_nomina,
                    codigo='IESS',
                    descripcion='Aporte IESS',
                    tipo='deduccion',
                    monto=237.50
                ),
                # Rubros para segunda nómina
                Rubro(
                    id_nomina=nominas[1].id_nomina if len(nominas) > 1 else nominas[0].id_nomina,
                    codigo='SUELDO',
                    descripcion='Sueldo base',
                    tipo='devengo',
                    monto=1800.00
                ),
                Rubro(
                    id_nomina=nominas[1].id_nomina if len(nominas) > 1 else nominas[0].id_nomina,
                    codigo='HORAS_EXTRA',
                    descripcion='Horas extras',
                    tipo='devengo',
                    monto=150.00
                ),
                Rubro(
                    id_nomina=nominas[1].id_nomina if len(nominas) > 1 else nominas[0].id_nomina,
                    codigo='IESS',
                    descripcion='Aporte IESS',
                    tipo='deduccion',
                    monto=171.00
                ),
            ]
            
            db.session.add_all(rubros)
            db.session.commit()
            print(f"Rubros: {Rubro.query.count()} registros\n")
