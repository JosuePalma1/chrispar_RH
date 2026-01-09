from extensions import db
from app import create_app
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Check schema
    result = db.session.execute(
        text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'mirror'")
    ).scalar()
    print(f"Schema 'mirror' exists: {result is not None}")
    
    # Check triggers
    trigger_count = db.session.execute(
        text("""
        SELECT COUNT(*)
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE t.tgname LIKE 'trg_mirror_%'
          AND n.nspname = 'public';
        """)
    ).scalar()
    print(f"Number of mirror triggers: {trigger_count}")
    
    # List tables in mirror schema
    if result:
        tables = db.session.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'mirror'")
        ).fetchall()
        print(f"Tables in mirror schema: {[t[0] for t in tables]}")
