#!/usr/bin/env python
"""
Database Seeder - Ejecuta todos los seeders en orden
Similar a DatabaseSeeder.php en Laravel
"""

from seeders.usuario_seeder import UsuarioSeeder
from seeders.cargo_seeder import CargoSeeder
from seeders.empleado_seeder import EmpleadoSeeder
from seeders.hoja_vida_seeder import HojaVidaSeeder
from seeders.horario_seeder import HorarioSeeder
from seeders.asistencia_seeder import AsistenciaSeeder
from seeders.permiso_seeder import PermisoSeeder
from seeders.nomina_seeder import NominaSeeder
from seeders.rubro_seeder import RubroSeeder

if __name__ == '__main__':
    print("\n" + "="*50)
    print("INICIANDO DATABASE SEEDER")
    print("="*50 + "\n")
    
    # Ejecutar seeders en orden de dependencias
    UsuarioSeeder.run()
    CargoSeeder.run()
    EmpleadoSeeder.run()
    HojaVidaSeeder.run()
    HorarioSeeder.run()
    AsistenciaSeeder.run()
    PermisoSeeder.run()
    NominaSeeder.run()
    RubroSeeder.run()
    
    print("="*50)
    print("SEEDER COMPLETADO EXITOSAMENTE")
    print("="*50)
    print("\nCredenciales de acceso:")
    print("   Username: admin")
    print("   Password: 123")
    print("\n   Username: supervisor")
    print("   Password: 123\n")
