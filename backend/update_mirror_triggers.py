"""
Script para actualizar los triggers del mirror y copiar los datos nuevos
"""
import psycopg2

DATABASE_URL = 'postgresql://postgres:123@localhost:5432/chrispar'

def update_mirror_triggers():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        print("🔧 Actualizando triggers del mirror para nominas...")
        
        # 1. Eliminar triggers existentes
        print("\n📝 Eliminando triggers antiguos...")
        cur.execute("DROP TRIGGER IF EXISTS trg_mirror_nominas ON public.nominas")
        print("  ✓ Triggers eliminados")
        
        # 2. Eliminar función existente
        cur.execute("DROP FUNCTION IF EXISTS mirror.fn_mirror_nominas() CASCADE")
        print("  ✓ Función eliminada")
        
        # 3. Crear nueva función con todas las columnas
        print("\n📝 Creando nueva función de trigger...")
        trigger_function = """
        CREATE OR REPLACE FUNCTION mirror.fn_mirror_nominas()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                INSERT INTO mirror.nominas (
                    id_nomina, id_empleado, fecha_inicio, fecha_fin, total, estado,
                    fecha_creacion, fecha_actualizacion, creado_por, modificado_por,
                    mes, sueldo_base, horas_extra, total_desembolsar, fecha_generacion
                ) VALUES (
                    NEW.id_nomina, NEW.id_empleado, NEW.fecha_inicio, NEW.fecha_fin, 
                    NEW.total, NEW.estado, NEW.fecha_creacion, NEW.fecha_actualizacion,
                    NEW.creado_por, NEW.modificado_por, NEW.mes, NEW.sueldo_base,
                    NEW.horas_extra, NEW.total_desembolsar, NEW.fecha_generacion
                );
            ELSIF TG_OP = 'UPDATE' THEN
                UPDATE mirror.nominas SET
                    id_empleado = NEW.id_empleado,
                    fecha_inicio = NEW.fecha_inicio,
                    fecha_fin = NEW.fecha_fin,
                    total = NEW.total,
                    estado = NEW.estado,
                    fecha_creacion = NEW.fecha_creacion,
                    fecha_actualizacion = NEW.fecha_actualizacion,
                    creado_por = NEW.creado_por,
                    modificado_por = NEW.modificado_por,
                    mes = NEW.mes,
                    sueldo_base = NEW.sueldo_base,
                    horas_extra = NEW.horas_extra,
                    total_desembolsar = NEW.total_desembolsar,
                    fecha_generacion = NEW.fecha_generacion
                WHERE id_nomina = NEW.id_nomina;
            ELSIF TG_OP = 'DELETE' THEN
                DELETE FROM mirror.nominas WHERE id_nomina = OLD.id_nomina;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
        cur.execute(trigger_function)
        print("  ✓ Función creada")
        
        # 4. Crear nuevo trigger
        print("\n📝 Creando nuevo trigger...")
        cur.execute("""
            CREATE TRIGGER trg_mirror_nominas
            AFTER INSERT OR UPDATE OR DELETE ON public.nominas
            FOR EACH ROW
            EXECUTE FUNCTION mirror.fn_mirror_nominas();
        """)
        print("  ✓ Trigger creado")
        
        # 5. Sincronizar datos existentes
        print("\n📝 Sincronizando datos existentes...")
        cur.execute("""
            UPDATE mirror.nominas m
            SET 
                mes = p.mes,
                sueldo_base = p.sueldo_base,
                horas_extra = p.horas_extra,
                total_desembolsar = p.total_desembolsar,
                fecha_generacion = p.fecha_generacion
            FROM public.nominas p
            WHERE m.id_nomina = p.id_nomina
        """)
        rows_updated = cur.rowcount
        print(f"  ✓ {rows_updated} registros sincronizados")
        
        print(f"\n✅ Triggers actualizados y datos sincronizados exitosamente")
        
    except Exception as e:
        print(f"❌ Error al actualizar triggers: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    update_mirror_triggers()
