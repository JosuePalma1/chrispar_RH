import psycopg2

conn = psycopg2.connect('postgresql://postgres:123@localhost:5432/chrispar')
cur = conn.cursor()

# Verificar columnas en public schema
cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'nominas' 
    ORDER BY ordinal_position
""")

print("Columnas en public.nominas:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

# Verificar si hay schemas adicionales
cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema')")
schemas = [r[0] for r in cur.fetchall()]
print(f"\nSchemas en la base de datos: {schemas}")

# Buscar tabla nominas en todos los schemas
cur.execute("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name = 'nominas'
""")
print("\nTabla 'nominas' encontrada en:")
for row in cur.fetchall():
    print(f"  - {row[0]}.{row[1]}")

conn.close()
