"""
Script para corregir el estado de las migraciones
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Obtener la URL de la base de datos
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:123@localhost:5432/chrispar')

# Extraer los componentes de la URL
# Formato: postgresql://user:password@host:port/dbname
url_parts = DATABASE_URL.replace('postgresql://', '').split('@')
user_pass = url_parts[0].split(':')
host_port_db = url_parts[1].split('/')
host_port = host_port_db[0].split(':')

user = user_pass[0]
password = user_pass[1]
host = host_port[0]
port = host_port[1] if len(host_port) > 1 else '5432'
dbname = host_port_db[1]

print(f"Conectando a {dbname} en {host}:{port}...")

try:
    conn = psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port
    )
    cur = conn.cursor()
    
    # Verificar si existe la columna 'mes' en nominas
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='nominas' AND column_name='mes'
    """)
    
    if cur.fetchone() is None:
        print("❌ La columna 'mes' NO existe en la tabla nominas")
        print("Agregando columna 'mes'...")
        cur.execute("ALTER TABLE nominas ADD COLUMN mes VARCHAR(20);")
        conn.commit()
        print("✅ Columna 'mes' agregada exitosamente")
    else:
        print("✅ La columna 'mes' ya existe")
    
    # Verificar la versión de alembic
    cur.execute("SELECT version_num FROM alembic_version;")
    result = cur.fetchone()
    
    if result:
        current_version = result[0]
        print(f"Versión actual de migración: {current_version}")
        
        # Actualizar a la versión correcta
        correct_version = 'b5911eac7f0a'
        if current_version != correct_version:
            print(f"Actualizando versión de migración a: {correct_version}")
            cur.execute(f"UPDATE alembic_version SET version_num='{correct_version}';")
            conn.commit()
            print("✅ Versión actualizada exitosamente")
    else:
        print("No hay versión de migración registrada")
        print("Insertando versión inicial...")
        cur.execute("INSERT INTO alembic_version (version_num) VALUES ('b5911eac7f0a');")
        conn.commit()
        print("✅ Versión inicial registrada")
    
    cur.close()
    conn.close()
    print("\n✅ Correcciones aplicadas exitosamente")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
