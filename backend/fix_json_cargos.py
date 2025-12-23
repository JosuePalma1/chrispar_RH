from app import create_app
from extensions import db
from models.cargo import Cargo
import json

app = create_app()

with app.app_context():
    print("Verificando JSON de cargos...")
    cargos = Cargo.query.all()
    fixed_count = 0
    
    for cargo in cargos:
        if cargo.permisos:
            try:
                # Intentar parsear
                json.loads(cargo.permisos)
            except json.JSONDecodeError:
                print(f"Error en cargo ID {cargo.id_cargo} ({cargo.nombre_cargo}): {cargo.permisos}")
                
                # Intentar arreglar reemplazando comillas simples por dobles
                try:
                    fixed_json = cargo.permisos.replace("'", '"')
                    json.loads(fixed_json) # Verificar si ahora es válido
                    
                    cargo.permisos = fixed_json
                    fixed_count += 1
                    print(f" -> Corregido a: {fixed_json}")
                except Exception:
                    # Intento 2: Formato sin comillas [item1,item2]
                    try:
                        content = cargo.permisos.strip("[]")
                        items = [item.strip() for item in content.split(',')]
                        # Filtrar items vacíos si los hay
                        items = [i for i in items if i]
                        fixed_json = json.dumps(items)
                        
                        cargo.permisos = fixed_json
                        fixed_count += 1
                        print(f" -> Corregido (formato lista simple) a: {fixed_json}")
                    except Exception as e:
                        print(f" -> No se pudo corregir automáticamente: {e}")
                    # Si es una lista de python stringificada, a veces True/False son problema
                    # Pero json requiere true/false (minúsculas)
                    pass

    if fixed_count > 0:
        db.session.commit()
        print(f"\nSe corrigieron {fixed_count} registros.")
    else:
        print("\nNo se encontraron registros corruptos o no se pudieron corregir.")
