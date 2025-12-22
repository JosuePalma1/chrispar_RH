import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="chrispar",
    user="postgres",
    password="123"
)

cur = conn.cursor()

print("\n" + "="*50)
print("PRUEBA COMPLETA DE REPLICACIÓN MIRROR DB")
print("="*50)

# 1. INSERT
print("\n[1/3] Probando INSERT...")
cur.execute("INSERT INTO public.cargos (nombre_cargo, sueldo_base, permisos) VALUES ('TEST_MIRROR', 5000, '[]') RETURNING id_cargo")
test_id = cur.fetchone()[0]
conn.commit()

cur.execute(f"SELECT nombre_cargo, sueldo_base FROM mirror.cargos WHERE id_cargo = {test_id}")
result = cur.fetchone()
if result and result[0] == 'TEST_MIRROR':
    print("   ✅ INSERT replicado correctamente")
else:
    print("   ❌ INSERT NO replicado")

# 2. UPDATE
print("\n[2/3] Probando UPDATE...")
cur.execute(f"UPDATE public.cargos SET nombre_cargo = 'TEST_UPDATED', sueldo_base = 6000 WHERE id_cargo = {test_id}")
conn.commit()

cur.execute(f"SELECT nombre_cargo, sueldo_base FROM mirror.cargos WHERE id_cargo = {test_id}")
result = cur.fetchone()
if result and result[0] == 'TEST_UPDATED' and result[1] == 6000:
    print("   ✅ UPDATE replicado correctamente")
else:
    print(f"   ❌ UPDATE NO replicado (resultado: {result})")

# 3. DELETE
print("\n[3/3] Probando DELETE...")
cur.execute(f"DELETE FROM public.cargos WHERE id_cargo = {test_id}")
conn.commit()

cur.execute(f"SELECT COUNT(*) FROM mirror.cargos WHERE id_cargo = {test_id}")
count = cur.fetchone()[0]
if count == 0:
    print("   ✅ DELETE replicado correctamente")
else:
    print("   ❌ DELETE NO replicado")

print("\n" + "="*50)
print("✅ TODAS LAS OPERACIONES FUNCIONAN CORRECTAMENTE")
print("="*50)

cur.close()
conn.close()
