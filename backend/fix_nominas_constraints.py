"""
Script para hacer que las columnas antiguas de nominas permitan NULL
"""
import psycopg2

DATABASE_URL = 'postgresql://postgres:123@localhost:5432/chrispar'

def fix_nominas_constraints():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        print("🔧 Modificando constraints de nominas...")
        
        # Hacer que las columnas antiguas permitan NULL en public
        columns_to_modify = ['fecha_inicio', 'fecha_fin', 'total', 'estado']
        
        for col in columns_to_modify:
            sql = f"ALTER TABLE public.nominas ALTER COLUMN {col} DROP NOT NULL"
            print(f"  Ejecutando: {sql}")
            cur.execute(sql)
            print(f"  ✓ Columna '{col}' ahora permite NULL")
        
        # Lo mismo para el schema mirror
        print("\n🔧 Modificando constraints de mirror.nominas...")
        for col in columns_to_modify:
            sql = f"ALTER TABLE mirror.nominas ALTER COLUMN {col} DROP NOT NULL"
            print(f"  Ejecutando: {sql}")
            cur.execute(sql)
            print(f"  ✓ Columna '{col}' ahora permite NULL en mirror")
        
        print(f"\n✅ Constraints modificadas exitosamente")
        
    except Exception as e:
        print(f"❌ Error al modificar constraints: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    fix_nominas_constraints()
