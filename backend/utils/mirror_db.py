from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
import re
from typing import Any
from uuid import UUID

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection


_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _to_jsonable(value: Any) -> Any:
	if value is None:
		return None
	if isinstance(value, (str, int, float, bool)):
		return value
	if isinstance(value, (datetime, date, time)):
		return value.isoformat()
	if isinstance(value, Decimal):
		# Prefer string to avoid precision surprises
		return str(value)
	if isinstance(value, UUID):
		return str(value)
	if isinstance(value, (bytes, bytearray, memoryview)):
		return bytes(value).hex()
	# Fallback: stringify unknown DB types (e.g., intervals)
	return str(value)


def _row_mapping_to_jsonable(row_mapping: Any) -> dict[str, Any]:
	return {k: _to_jsonable(v) for k, v in dict(row_mapping).items()}


def _validate_ident(name: str, *, what: str) -> str:
	if not name or not _IDENTIFIER_RE.match(name):
		raise ValueError(f"Identificador inválido para {what}: {name!r}")
	return name


def _q_sqlite_ident(name: str) -> str:
	_validate_ident(name, what="SQLite identifier")
	# SQLite: double-quote identifiers.
	return '"' + name.replace('"', '""') + '"'


def _q_pg_ident(name: str) -> str:
	_validate_ident(name, what="Postgres identifier")
	return '"' + name.replace('"', '""') + '"'


@dataclass(frozen=True)
class MirrorSetupResult:
	mirror_schema: str
	mirror_path: str | None
	tables_created: list[str]
	triggers_created: int
	skipped_tables: list[str]


def attach_mirror_if_needed(conn: Connection, mirror_path: str | None, *, schema_name: str = "mirror") -> bool:
	"""Attach the mirror SQLite DB as `schema_name` if needed.

	For non-SQLite dialects, this is a no-op and returns True.
	"""
	if conn.dialect.name != "sqlite":
		return True
	if not mirror_path:
		return False

	schema_name = _validate_ident(schema_name, what="mirror schema")

	# Check if already attached.
	rows = conn.exec_driver_sql("PRAGMA database_list;").fetchall()
	for row in rows:
		# row = (seq, name, file)
		if len(row) >= 2 and row[1] == schema_name:
			return True

	# ATTACH creates the file if it doesn't exist.
	conn.exec_driver_sql(f"ATTACH DATABASE ? AS {_q_sqlite_ident(schema_name)};", (mirror_path,))
	return True


def list_mirror_tables(conn: Connection, *, schema_name: str = "mirror") -> list[str]:
	schema_name = _validate_ident(schema_name, what="schema")
	if conn.dialect.name == "sqlite":
		q = f"SELECT name FROM {_q_sqlite_ident(schema_name)}.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
		return [r[0] for r in conn.exec_driver_sql(q).fetchall()]

	# Postgres (and compatible): use information_schema
	rows = conn.exec_driver_sql(
		"""
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = %s
		  AND table_type = 'BASE TABLE'
		ORDER BY table_name;
		""",
		(schema_name,),
	).fetchall()
	return [r[0] for r in rows]


def fetch_mirror_table_preview(
	conn: Connection,
	*,
	table_name: str,
	limit: int = 50,
	schema_name: str = "mirror",
) -> dict[str, Any]:
	schema_name = _validate_ident(schema_name, what="schema")
	table_name = _validate_ident(table_name, what="table")
	try:
		limit_int = int(limit)
	except Exception as e:
		raise ValueError("limit inválido") from e
	if limit_int < 0 or limit_int > 500:
		raise ValueError("limit fuera de rango (0..500)")

	if conn.dialect.name == "sqlite":
		order_by = ""
		try:
			pk_cols = _sqlite_pk_columns(conn, table_name)
			if pk_cols:
				order_by = f" ORDER BY {_q_sqlite_ident(pk_cols[0])} DESC"
		except Exception:
			order_by = ""

		sql = f"SELECT * FROM {_q_sqlite_ident(schema_name)}.{_q_sqlite_ident(table_name)}{order_by} LIMIT ?;"
		result = conn.exec_driver_sql(sql, (limit_int,))
		columns = list(result.keys())
		rows = [_row_mapping_to_jsonable(r._mapping) for r in result.fetchall()]
		return {"table": table_name, "columns": columns, "rows": rows}

	# Postgres
	order_by = ""
	try:
		insp = inspect(conn)
		pk = insp.get_pk_constraint(table_name, schema=schema_name) or {}
		pk_cols = pk.get("constrained_columns") or []
		pk_cols = [c for c in pk_cols if _IDENTIFIER_RE.match(c)]
		if pk_cols:
			order_by = f" ORDER BY {_q_pg_ident(pk_cols[0])} DESC"
	except Exception:
		order_by = ""

	sql = text(
		f"SELECT * FROM {_q_pg_ident(schema_name)}.{_q_pg_ident(table_name)}{order_by} LIMIT :limit;"
	)
	result = conn.execute(sql, {"limit": limit_int})
	columns = list(result.keys())
	rows = [_row_mapping_to_jsonable(r._mapping) for r in result.fetchall()]
	return {"table": table_name, "columns": columns, "rows": rows}


def _sqlite_main_tables(conn: Connection) -> list[str]:
	rows = conn.exec_driver_sql(
		"""
		SELECT name
		FROM sqlite_master
		WHERE type='table'
		  AND name NOT LIKE 'sqlite_%'
		ORDER BY name;
		"""
	).fetchall()
	return [r[0] for r in rows]


def _sqlite_table_columns(conn: Connection, table_name: str) -> list[str]:
	_validate_ident(table_name, what="table")	
	rows = conn.exec_driver_sql(f"PRAGMA table_info({_q_sqlite_ident(table_name)});").fetchall()
	# PRAGMA table_info: cid, name, type, notnull, dflt_value, pk
	return [r[1] for r in rows]


def _sqlite_pk_columns(conn: Connection, table_name: str) -> list[str]:
	_validate_ident(table_name, what="table")	
	rows = conn.exec_driver_sql(f"PRAGMA table_info({_q_sqlite_ident(table_name)});").fetchall()
	pk_cols = [r[1] for r in rows if int(r[5] or 0) > 0]
	# Keep pk order (sqlite uses 1..n)
	return pk_cols


def _sqlite_table_exists(conn: Connection, *, schema_name: str, table_name: str) -> bool:
	schema_name = _validate_ident(schema_name, what="schema")
	table_name = _validate_ident(table_name, what="table")
	q = f"SELECT 1 FROM {_q_sqlite_ident(schema_name)}.sqlite_master WHERE type='table' AND name = ? LIMIT 1;"
	return conn.exec_driver_sql(q, (table_name,)).fetchone() is not None


def _sqlite_create_mirror_table(conn: Connection, *, schema_name: str, table_name: str) -> None:
	schema_name = _validate_ident(schema_name, what="schema")
	table_name = _validate_ident(table_name, what="table")
	# Create with column names/types inferred; constraints not copied.
	conn.exec_driver_sql(
		f"CREATE TABLE IF NOT EXISTS {_q_sqlite_ident(schema_name)}.{_q_sqlite_ident(table_name)} AS SELECT * FROM {_q_sqlite_ident(table_name)} WHERE 0;"
	)


def _sqlite_drop_mirror_triggers(conn: Connection, *, table_name: str) -> None:
	_validate_ident(table_name, what="table")
	for suffix in ("ai", "au", "ad"):
		conn.exec_driver_sql(f"DROP TRIGGER IF EXISTS {_q_sqlite_ident('trg_mirror_' + table_name + '_' + suffix)};")


def _sqlite_create_mirror_triggers(conn: Connection, *, schema_name: str, table_name: str) -> int:
	schema_name = _validate_ident(schema_name, what="schema")
	table_name = _validate_ident(table_name, what="table")

	cols = _sqlite_table_columns(conn, table_name)
	pk_cols = _sqlite_pk_columns(conn, table_name)
	if not cols or not pk_cols:
		return 0

	cols_list = ", ".join(_q_sqlite_ident(c) for c in cols)
	new_values = ", ".join(f"NEW.{_q_sqlite_ident(c)}" for c in cols)
	pk_where_new = " AND ".join(f"{_q_sqlite_ident(c)} = NEW.{_q_sqlite_ident(c)}" for c in pk_cols)
	pk_where_old = " AND ".join(f"{_q_sqlite_ident(c)} = OLD.{_q_sqlite_ident(c)}" for c in pk_cols)

	# Insert trigger: upsert via delete+insert (works without unique constraints)
	trg_ai = _q_sqlite_ident(f"trg_mirror_{table_name}_ai")
	trg_au = _q_sqlite_ident(f"trg_mirror_{table_name}_au")
	trg_ad = _q_sqlite_ident(f"trg_mirror_{table_name}_ad")

	mirror_table = f"{_q_sqlite_ident(schema_name)}.{_q_sqlite_ident(table_name)}"
	main_table = _q_sqlite_ident(table_name)

	conn.exec_driver_sql(
		f"""
		CREATE TRIGGER {trg_ai}
		AFTER INSERT ON {main_table}
		BEGIN
			DELETE FROM {mirror_table} WHERE {pk_where_new};
			INSERT INTO {mirror_table} ({cols_list}) VALUES ({new_values});
		END;
		"""
	)
	conn.exec_driver_sql(
		f"""
		CREATE TRIGGER {trg_au}
		AFTER UPDATE ON {main_table}
		BEGIN
			DELETE FROM {mirror_table} WHERE {pk_where_old};
			INSERT INTO {mirror_table} ({cols_list}) VALUES ({new_values});
		END;
		"""
	)
	conn.exec_driver_sql(
		f"""
		CREATE TRIGGER {trg_ad}
		AFTER DELETE ON {main_table}
		BEGIN
			DELETE FROM {mirror_table} WHERE {pk_where_old};
		END;
		"""
	)

	return 3


def _pg_public_tables(conn: Connection) -> list[str]:
	insp = inspect(conn)
	return [t for t in insp.get_table_names(schema="public") if _IDENTIFIER_RE.match(t)]


def _pg_table_columns(conn: Connection, table_name: str) -> list[str]:
	table_name = _validate_ident(table_name, what="table")
	insp = inspect(conn)
	cols = insp.get_columns(table_name, schema="public")
	return [c["name"] for c in cols if _IDENTIFIER_RE.match(c["name"]) ]


def _pg_pk_columns(conn: Connection, table_name: str) -> list[str]:
	table_name = _validate_ident(table_name, what="table")
	insp = inspect(conn)
	pk = insp.get_pk_constraint(table_name, schema="public") or {}
	cols = pk.get("constrained_columns") or []
	return [c for c in cols if _IDENTIFIER_RE.match(c)]


def setup_mirror_schema_and_triggers(
	conn: Connection,
	*,
	mirror_path: str | None = None,
	schema_name: str = "mirror",
	copy_data: bool = True,
) -> MirrorSetupResult:
	schema_name = _validate_ident(schema_name, what="mirror schema")
	tables_created: list[str] = []
	skipped_tables: list[str] = []
	triggers_created = 0

	dialect = conn.dialect.name

	if dialect == "sqlite":
		attached = attach_mirror_if_needed(conn, mirror_path, schema_name=schema_name)
		if not attached:
			raise ValueError("No se pudo adjuntar la BD espejo (SQLite)")

		for table in _sqlite_main_tables(conn):
			if not _IDENTIFIER_RE.match(table):
				skipped_tables.append(table)
				continue

			if not _sqlite_table_exists(conn, schema_name=schema_name, table_name=table):
				_sqlite_create_mirror_table(conn, schema_name=schema_name, table_name=table)
				tables_created.append(table)

			if copy_data:
				conn.exec_driver_sql(
					f"DELETE FROM {_q_sqlite_ident(schema_name)}.{_q_sqlite_ident(table)};"
				)
				conn.exec_driver_sql(
					f"INSERT INTO {_q_sqlite_ident(schema_name)}.{_q_sqlite_ident(table)} SELECT * FROM {_q_sqlite_ident(table)};"
				)

			_sqlite_drop_mirror_triggers(conn, table_name=table)
			created = _sqlite_create_mirror_triggers(conn, schema_name=schema_name, table_name=table)
			if created == 0:
				skipped_tables.append(table)
			else:
				triggers_created += created

		return MirrorSetupResult(
			mirror_schema=schema_name,
			mirror_path=mirror_path,
			tables_created=tables_created,
			triggers_created=triggers_created,
			skipped_tables=skipped_tables,
		)

	# Postgres schema mirror (same DB, separate schema)
	if dialect.startswith("postgres"):
		conn.exec_driver_sql(f"CREATE SCHEMA IF NOT EXISTS {_q_pg_ident(schema_name)};")

		for table in _pg_public_tables(conn):
			if table == "alembic_version":
				# not useful to mirror
				continue

			cols = _pg_table_columns(conn, table)
			pk_cols = _pg_pk_columns(conn, table)
			if not cols:
				skipped_tables.append(table)
				continue

			# Create mirror table without constraints to avoid FK issues.
			conn.exec_driver_sql(
				f"CREATE TABLE IF NOT EXISTS {_q_pg_ident(schema_name)}.{_q_pg_ident(table)} (LIKE public.{_q_pg_ident(table)} INCLUDING DEFAULTS INCLUDING IDENTITY INCLUDING GENERATED);"
			)

			# Ensure a unique index on PK columns so we can ON CONFLICT.
			if pk_cols:
				idx_name = _validate_ident(f"ux_mirror_{table}_pk", what="index")
				pk_cols_sql = ", ".join(_q_pg_ident(c) for c in pk_cols)
				conn.exec_driver_sql(
					f"CREATE UNIQUE INDEX IF NOT EXISTS {_q_pg_ident(idx_name)} ON {_q_pg_ident(schema_name)}.{_q_pg_ident(table)} ({pk_cols_sql});"
				)
			else:
				skipped_tables.append(table)

			if copy_data:
				# Best effort: replace mirror with fresh copy.
				conn.exec_driver_sql(f"TRUNCATE TABLE {_q_pg_ident(schema_name)}.{_q_pg_ident(table)};")
				conn.exec_driver_sql(
					f"INSERT INTO {_q_pg_ident(schema_name)}.{_q_pg_ident(table)} SELECT * FROM public.{_q_pg_ident(table)};"
				)

			tables_created.append(table)

			# Triggers only if PK exists.
			if not pk_cols:
				continue

			non_pk_cols = [c for c in cols if c not in pk_cols]
			insert_cols = ", ".join(_q_pg_ident(c) for c in cols)
			insert_vals = ", ".join(f"NEW.{_q_pg_ident(c)}" for c in cols)
			pk_cols_sql = ", ".join(_q_pg_ident(c) for c in pk_cols)

			set_clause = ", ".join(f"{_q_pg_ident(c)} = EXCLUDED.{_q_pg_ident(c)}" for c in non_pk_cols)
			if not set_clause:
				set_clause = ", ".join(f"{_q_pg_ident(c)} = {_q_pg_ident(c)}" for c in pk_cols)

			where_old = " AND ".join(f"{_q_pg_ident(c)} = OLD.{_q_pg_ident(c)}" for c in pk_cols)

			fn_name = _validate_ident(f"trg_mirror_{table}_fn", what="function")
			trg_name = _validate_ident(f"trg_mirror_{table}", what="trigger")

			conn.exec_driver_sql(
				f"""
				CREATE OR REPLACE FUNCTION public.{_q_pg_ident(fn_name)}()
				RETURNS trigger
				LANGUAGE plpgsql
				AS $$
				BEGIN
					IF (TG_OP = 'DELETE') THEN
						DELETE FROM {_q_pg_ident(schema_name)}.{_q_pg_ident(table)} WHERE {where_old};
						RETURN OLD;
					ELSIF (TG_OP = 'UPDATE') THEN
						INSERT INTO {_q_pg_ident(schema_name)}.{_q_pg_ident(table)} ({insert_cols})
						VALUES ({insert_vals})
						ON CONFLICT ({pk_cols_sql}) DO UPDATE SET {set_clause};
						RETURN NEW;
					ELSIF (TG_OP = 'INSERT') THEN
						INSERT INTO {_q_pg_ident(schema_name)}.{_q_pg_ident(table)} ({insert_cols})
						VALUES ({insert_vals})
						ON CONFLICT ({pk_cols_sql}) DO UPDATE SET {set_clause};
						RETURN NEW;
					END IF;
					RETURN NULL;
				END;
				$$;
				"""
			)

			conn.exec_driver_sql(
				f"DROP TRIGGER IF EXISTS {_q_pg_ident(trg_name)} ON public.{_q_pg_ident(table)};"
			)
			conn.exec_driver_sql(
				f"CREATE TRIGGER {_q_pg_ident(trg_name)} AFTER INSERT OR UPDATE OR DELETE ON public.{_q_pg_ident(table)} FOR EACH ROW EXECUTE FUNCTION public.{_q_pg_ident(fn_name)}();"
			)
			triggers_created += 1

		return MirrorSetupResult(
			mirror_schema=schema_name,
			mirror_path=None,
			tables_created=tables_created,
			triggers_created=triggers_created,
			skipped_tables=skipped_tables,
		)

	raise ValueError(f"Dialecto no soportado para Mirror DB: {dialect}")


def auto_setup_postgres_schema_mirror(engine, schema_name: str = "mirror") -> dict | None:
	"""Auto-configure Postgres schema mirror on startup if not already set up.
	
	Returns dict with setup info or None if already configured.
	"""
	from sqlalchemy import text
	schema_name = _validate_ident(schema_name, what="schema")
	
	with engine.begin() as conn:
		# Check if schema exists
		schema_exists = conn.execute(
			text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :schema"),
			{"schema": schema_name}
		).scalar()
		
		# Check if triggers exist
		trigger_count = conn.execute(
			text("""
			SELECT COUNT(*)
			FROM pg_trigger t
			JOIN pg_class c ON c.oid = t.tgrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE t.tgname LIKE 'trg_mirror_%'
			  AND n.nspname = 'public';
			""")
		).scalar() or 0
		
		# If already configured, skip
		if schema_exists and trigger_count > 0:
			return None
		
		# Setup required
		result = setup_mirror_schema_and_triggers(
			conn,
			mirror_path=None,
			schema_name=schema_name,
			copy_data=True
		)
		
		return {
			"tables_created": result.tables_created,
			"triggers_created": result.triggers_created,
			"skipped_tables": result.skipped_tables
		}
