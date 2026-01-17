import psycopg2

conn = psycopg2.connect('postgresql://postgres:123@localhost:5432/chrispar')
cur = conn.cursor()

# Ver columnas y sus constraints
cur.execute("""
    SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'nominas' 
    ORDER BY ordinal_position
""")

print("Columnas en public.nominas:")
print(f"{'Column':<25} {'Type':<20} {'Nullable':<10} {'Default'}")
print("="*80)
for row in cur.fetchall():
    print(f"{row[0]:<25} {row[1]:<20} {row[2]:<10} {row[3] or ''}")

conn.close()
