"""
Script para actualizar test_rubro_routes.py con los campos correctos de nómina
"""
import re

file_path = 'tests/test_rubro_routes.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón para encontrar los bloques de nomina_data
pattern = r'nomina_data = \{\s+"id_empleado": ([^,]+),\s+"mes": "([^"]+)",\s+"total": ([\d.]+)\s+\}'

def replace_nomina(match):
    id_empleado = match.group(1)
    mes = match.group(2)
    total = float(match.group(3))
    
    # Calcular sueldo_base (80% del total) y horas_extra (20% del total)
    sueldo_base = round(total * 0.8, 2)
    horas_extra = round(total * 0.2, 2)
    
    return f'''nomina_data = {{
            "id_empleado": {id_empleado},
            "mes": "{mes}",
            "sueldo_base": {sueldo_base},
            "horas_extra": {horas_extra},
            "total_desembolsar": {total}
        }}'''

# Reemplazar todos los matches
new_content = re.sub(pattern, replace_nomina, content)

# Escribir el archivo actualizado
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Archivo test_rubro_routes.py actualizado")
print(f"   Se reemplazaron {len(re.findall(pattern, content))} instancias de nomina_data")
