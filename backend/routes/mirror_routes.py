import os

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.pool import NullPool

from extensions import db
from utils.auth import admin_required
from utils.mirror_db import (
	attach_mirror_if_needed,
	fetch_mirror_table_preview,
	list_mirror_tables,
	setup_mirror_schema_and_triggers,
)

mirror_bp = Blueprint("mirror", __name__, url_prefix="/api/mirror")


def _safe_url_info(url: str | None) -> dict | None:
	if not url:
		return None
	try:
		u = make_url(url)
		return {
			"driver": u.drivername,
			"host": u.host,
			"port": u.port,
			"database": u.database,
			"username": u.username,
		}
	except Exception:
		return {"configured": True}


def _get_mirror_path() -> str:
	return current_app.config.get("MIRROR_DB_PATH")


def _get_mirror_schema() -> str:
	return current_app.config.get("MIRROR_SCHEMA", "mirror")


def _get_mirror_database_url() -> str | None:
	return current_app.config.get("MIRROR_DATABASE_URL")


def _get_mirror_mode(dialect: str) -> str:
	# external: separate Postgres DB (e.g. another container)
	if dialect.startswith("postgres") and _get_mirror_database_url():
		return "external"
	# schema: same Postgres DB, separate schema
	if dialect.startswith("postgres"):
		return "schema"
	# sqlite: attached file
	if dialect == "sqlite":
		return "sqlite"
	return "unknown"


def _get_external_mirror_engine(mirror_database_url: str):
	"""Return a cached SQLAlchemy Engine for the external mirror.

	We use NullPool to avoid holding open pooled connections across requests.
	Creating a new Engine per request can accumulate pools/connections and
	contribute to resource exhaustion on long-running dev sessions.
	"""
	cache_key = "_mirror_external_engine"
	eng = current_app.extensions.get(cache_key)
	if eng is None:
		eng = create_engine(
			mirror_database_url,
			pool_pre_ping=True,
			poolclass=NullPool,
		)
		current_app.extensions[cache_key] = eng
	return eng


@mirror_bp.route("/status", methods=["GET"])
@admin_required
def mirror_status(current_user):
	mirror_path = _get_mirror_path()
	mirror_schema = _get_mirror_schema()
	mirror_database_url = _get_mirror_database_url()
	dialect = db.engine.dialect.name
	mirror_mode = _get_mirror_mode(dialect)

	exists = bool(mirror_path and os.path.exists(mirror_path)) if dialect == "sqlite" else True

	try:
		with db.engine.connect() as conn:
			attached: bool | None = None
			if dialect == "sqlite":
				attached = attach_mirror_if_needed(conn, mirror_path, schema_name=mirror_schema)

			trigger_count = 0
			if dialect == "sqlite" and attached:
				trigger_count = conn.exec_driver_sql(
					"SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_mirror_%';"
				).scalar() or 0
			elif mirror_mode == "schema" and dialect.startswith("postgres"):
				# Only counts triggers created by schema-mirror mode (not logical replication)
				trigger_count = (
					conn.execute(
						text(
							"""
							SELECT COUNT(*)
							FROM pg_trigger t
							JOIN pg_class c ON c.oid = t.tgrelid
							JOIN pg_namespace n ON n.oid = c.relnamespace
							WHERE t.tgname LIKE 'trg_mirror_%'
							  AND n.nspname = 'public';
							"""
						)
					)
					.scalar()
					or 0
				)

			if mirror_mode == "external":
				mirror_engine = _get_external_mirror_engine(mirror_database_url)
				with mirror_engine.connect() as mirror_conn:
					tables = list_mirror_tables(mirror_conn, schema_name="public")
			elif dialect == "sqlite":
				tables = list_mirror_tables(conn, schema_name=mirror_schema) if attached else []
			elif mirror_mode == "schema" and dialect.startswith("postgres"):
				tables = list_mirror_tables(conn, schema_name=mirror_schema)
			else:
				tables = []

	except Exception as e:
		return jsonify(
			{
				"dialect": dialect,
				"mirror_mode": mirror_mode,
				"mirror_schema": mirror_schema,
				"mirror_path": mirror_path if dialect == "sqlite" else None,
				"mirror_database_url": "configured" if mirror_database_url else None,
				"exists": exists,
				"attached": False,
				"error": str(e),
			}
		), 500

	# Get the current DATABASE_URI (which might have been changed during failover)
	current_db_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI")
	
	# Determine original primary URL (from environment or config)
	# If DATABASE_URL was set originally, that's the primary
	original_primary_url = os.getenv("DATABASE_URL") or current_db_uri
	
	# Detect which database is currently active
	if 'postgres_mirror' in current_db_uri or (mirror_database_url and current_db_uri == mirror_database_url):
		current_active_db = "mirror"
	else:
		current_active_db = "primary"
	
	return jsonify(
		{
			"dialect": dialect,
			"mirror_mode": mirror_mode,
			"mirror_schema": mirror_schema,
			"mirror_path": mirror_path if dialect == "sqlite" else None,
			"mirror_database_url": "configured" if mirror_database_url else None,
			"primary_connection": _safe_url_info(original_primary_url),
			"mirror_connection": _safe_url_info(mirror_database_url),
			"current_active_db": current_active_db,
			"current_connection": _safe_url_info(current_db_uri),
			"exists": exists,
			"attached": bool(attached) if attached is not None else None,
			"tables": tables,
			"mirror_tables_count": len(tables),
			"mirror_triggers_count": int(trigger_count),
		}
	), 200


@mirror_bp.route("/setup", methods=["POST"])
@admin_required
def mirror_setup(current_user):
	mirror_path = _get_mirror_path()
	mirror_schema = _get_mirror_schema()
	mirror_database_url = _get_mirror_database_url()
	dialect = db.engine.dialect.name
	mirror_mode = _get_mirror_mode(dialect)

	# External mirror (separate container/DB): configured via logical replication.
	if mirror_mode == "external":
		return jsonify(
			{
				"error": "Espejo externo detectado (MIRROR_DATABASE_URL). La sincronización se hace con replicación (publication/subscription), no con este botón."
			}
		), 400

	# Postgres schema-mirror mode uses DDL (CREATE/DROP TRIGGER) on public tables.
	# That takes ACCESS EXCLUSIVE locks and can block normal reads/writes, causing
	# the UI to quedarse en 'cargando...' and eventually exhausting the primary DB pool.
	# For safety, we disable it by default.
	if dialect.startswith("postgres"):
		return jsonify(
			{
				"error": "Modo Postgres 'schema mirror' está deshabilitado para evitar bloqueos. Usa espejo externo (MIRROR_DATABASE_URL) + replicación lógica."
			}
		), 400

	if dialect == "sqlite" and not mirror_path:
		return jsonify({"error": "MIRROR_DB_PATH no está configurado (SQLite)"}), 400

	try:
		payload = request.get_json(silent=True) or {}
		copy_data = bool(payload.get("copy_data", True))

		with db.engine.begin() as conn:
			result = setup_mirror_schema_and_triggers(
				conn,
				mirror_path=mirror_path if dialect == "sqlite" else None,
				schema_name=mirror_schema,
				copy_data=copy_data,
			)

		return jsonify(
			{
				"mensaje": "BD espejo configurada",
				"dialect": dialect,
				"mirror_mode": mirror_mode,
				"mirror_schema": result.mirror_schema,
				"mirror_path": result.mirror_path if dialect == "sqlite" else None,
				"tables_created": result.tables_created,
				"triggers_created": result.triggers_created,
				"skipped_tables": result.skipped_tables,
			}
		), 200
	except Exception as e:
		return jsonify({"error": str(e)}), 500


@mirror_bp.route("/tables", methods=["GET"])
@admin_required
def mirror_tables(current_user):
	mirror_path = _get_mirror_path()
	mirror_schema = _get_mirror_schema()
	mirror_database_url = _get_mirror_database_url()
	dialect = db.engine.dialect.name
	mirror_mode = _get_mirror_mode(dialect)

	try:
		if mirror_mode == "external":
			mirror_engine = _get_external_mirror_engine(mirror_database_url)
			with mirror_engine.connect() as mirror_conn:
				tables = list_mirror_tables(mirror_conn, schema_name="public")
				return jsonify({"tables": tables}), 200

		with db.engine.connect() as conn:
			attached = True
			if dialect == "sqlite":
				attached = attach_mirror_if_needed(conn, mirror_path, schema_name=mirror_schema)
				if not attached:
					return jsonify({"error": "No se pudo adjuntar la BD espejo"}), 500

			tables = list_mirror_tables(conn, schema_name=mirror_schema)
			return jsonify({"tables": tables}), 200
	except Exception as e:
		return jsonify({"error": str(e)}), 500


@mirror_bp.route("/table/<string:table_name>", methods=["GET"])
@admin_required
def mirror_table_preview(current_user, table_name: str):
	mirror_path = _get_mirror_path()
	mirror_schema = _get_mirror_schema()
	mirror_database_url = _get_mirror_database_url()
	dialect = db.engine.dialect.name
	mirror_mode = _get_mirror_mode(dialect)
	limit = request.args.get("limit", 50)

	try:
		if mirror_mode == "external":
			mirror_engine = _get_external_mirror_engine(mirror_database_url)
			with mirror_engine.connect() as mirror_conn:
				preview = fetch_mirror_table_preview(
					mirror_conn,
					table_name=table_name,
					limit=int(limit),
					schema_name="public",
				)
				return jsonify(preview), 200

		with db.engine.connect() as conn:
			attached = True
			if dialect == "sqlite":
				attached = attach_mirror_if_needed(conn, mirror_path, schema_name=mirror_schema)
				if not attached:
					return jsonify({"error": "No se pudo adjuntar la BD espejo"}), 500

			preview = fetch_mirror_table_preview(
				conn,
				table_name=table_name,
				limit=int(limit),
				schema_name=mirror_schema,
			)
			return jsonify(preview), 200
	except ValueError as e:
		return jsonify({"error": str(e)}), 400
	except Exception as e:
		return jsonify({"error": str(e)}), 500
