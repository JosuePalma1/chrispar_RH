"""
Script para sincronizar el schema mirror con el schema public
"""
import psycopg2

DATABASE_URL = 'postgresql://postgres:123@localhost:5432/chrispar'

def sync_mirror_schema():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        print("🔄 Sincronizando schema mirror con public...")
        
        # Verificar columnas en public.nominas
        cur.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'nominas' 
            ORDER BY ordinal_position
        """)
        public_columns = {row[0]: row for row in cur.fetchall()}
        print(f"✓ Columnas en public.nominas: {list(public_columns.keys())}")
        
        # Verificar columnas en mirror.nominas
        cur.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'mirror' AND table_name = 'nominas' 
            ORDER BY ordinal_position
        """)
        mirror_columns = {row[0]: row for row in cur.fetchall()}
        print(f"✓ Columnas en mirror.nominas: {list(mirror_columns.keys())}")
        
        # Encontrar columnas faltantes en mirror
        missing_columns = set(public_columns.keys()) - set(mirror_columns.keys())
        
        if not missing_columns:
            print("✅ El schema mirror ya está sincronizado")
            return
        
        print(f"\n⚠️  Columnas faltantes en mirror.nominas: {missing_columns}")
        
        # Agregar columnas faltantes
        for col_name in missing_columns:
            col_info = public_columns[col_name]
            data_type = col_info[1]
            char_length = col_info[2]
            is_nullable = col_info[3]
            
            # Construir tipo de dato
            if char_length:
                full_type = f"{data_type}({char_length})"
            else:
                full_type = data_type
            
            # Construir cláusula NULL
            null_clause = "" if is_nullable == 'YES' else "NOT NULL"
            
            # Agregar columna
            sql = f"ALTER TABLE mirror.nominas ADD COLUMN IF NOT EXISTS {col_name} {full_type} {null_clause}"
            print(f"  Ejecutando: {sql}")
            cur.execute(sql)
            print(f"  ✓ Columna '{col_name}' agregada")
        
        print(f"\n✅ Schema mirror sincronizado exitosamente")
        
    except Exception as e:
        print(f"❌ Error al sincronizar schema: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    sync_mirror_schema()
