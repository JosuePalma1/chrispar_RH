import psycopg2

conn = psycopg2.connect('postgresql://postgres:123@localhost:5432/chrispar')
cur = conn.cursor()

print("=" * 80)
print("VERIFICACIÓN DE SCHEMA MIRROR - NOMINAS")
print("=" * 80)

# Verificar columnas en mirror.nominas
cur.execute("""
    SELECT column_name, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'mirror' AND table_name = 'nominas' 
    ORDER BY ordinal_position
""")

print("\n📋 Columnas en mirror.nominas:")
for row in cur.fetchall():
    nullable = "✓ NULL" if row[1] == 'YES' else "✗ NOT NULL"
    print(f"  {row[0]:<25} {nullable}")

# Contar registros
cur.execute("SELECT COUNT(*) FROM mirror.nominas")
count = cur.fetchone()[0]
print(f"\n📊 Total de registros en mirror.nominas: {count}")

# Ver últimos 3 registros
cur.execute("""
    SELECT id_nomina, id_empleado, mes, sueldo_base, horas_extra, total_desembolsar
    FROM mirror.nominas 
    ORDER BY id_nomina DESC 
    LIMIT 3
""")
print("\n📝 Últimos 3 registros en mirror.nominas:")
for row in cur.fetchall():
    print(f"  ID: {row[0]}, Empleado: {row[1]}, Mes: {row[2]}, Sueldo: {row[3]}, Horas Extra: {row[4]}, Total: {row[5]}")

# Verificar triggers
cur.execute("""
    SELECT trigger_name, event_manipulation
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table = 'nominas'
""")
print("\n🔧 Triggers en public.nominas:")
for row in cur.fetchall():
    print(f"  {row[0]} - {row[1]}")

conn.close()
print("\n" + "=" * 80)
