from app import create_app
from extensions import db
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    
    # Fix NOMINAS table
    print("=" * 50)
    print("CHECKING NOMINAS TABLE")
    print("=" * 50)
    nomina_cols = [col['name'] for col in inspector.get_columns('nominas')]
    print("Current columns:", nomina_cols)
    
    required_nomina_cols = {
        'mes': 'VARCHAR(20)',
        'sueldo_base': 'FLOAT NOT NULL DEFAULT 0.0',
        'horas_extra': 'FLOAT NOT NULL DEFAULT 0.0',
        'total_desembolsar': 'FLOAT NOT NULL DEFAULT 0.0',
        'fecha_generacion': 'DATE'
    }
    
    try:
        with db.engine.connect() as conn:
            for col_name, col_type in required_nomina_cols.items():
                if col_name not in nomina_cols:
                    print(f"Adding '{col_name}' to nominas...")
                    conn.execute(text(f"ALTER TABLE nominas ADD COLUMN {col_name} {col_type}"))
            conn.execute(text("COMMIT"))
            print("✓ Nominas table fixed")
    except Exception as e:
        print(f"✗ Failed to fix nominas: {e}")
    
    # Fix RUBROS table
    print("\n" + "=" * 50)
    print("CHECKING RUBROS TABLE")
    print("=" * 50)
    rubro_cols = [col['name'] for col in inspector.get_columns('rubros')]
    print("Current columns:", rubro_cols)
    
    required_rubro_cols = {
        'operacion': "VARCHAR(10) NOT NULL DEFAULT 'suma'",
        'tipo': 'VARCHAR(100) NOT NULL',
        'monto': 'FLOAT NOT NULL',
        'autorizado_por': 'VARCHAR(200)',
        'motivo': 'TEXT',
        'fecha': 'DATE'
    }

    try:
        with db.engine.connect() as conn:
            for col_name, col_type in required_rubro_cols.items():
                if col_name not in rubro_cols:
                    print(f"Adding '{col_name}' to rubros...")
                    conn.execute(text(f"ALTER TABLE rubros ADD COLUMN {col_name} {col_type}"))
            conn.execute(text("COMMIT"))
            print("✓ Rubros table fixed")
    except Exception as e:
        print(f"✗ Failed to fix rubros: {e}")
    
    print("\n" + "=" * 50)
    print("SCHEMA FIX COMPLETE")
    print("=" * 50)


