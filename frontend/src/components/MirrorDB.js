import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import './MirrorDB.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function isAdminRole(rol) {
	if (!rol) return false;
	const r = String(rol).toLowerCase();
	return r === 'administrador' || r === 'admin' || r === 'supervisor';
}

function decodeTokenPayload(token) {
	if (!token) return null;
	try {
		return JSON.parse(atob(token.split('.')[1]));
	} catch {
		return null;
	}
}

function MirrorDB() {
	const token = localStorage.getItem('token');
	const payload = useMemo(() => decodeTokenPayload(token), [token]);
	const canAccess = isAdminRole(payload?.rol);

	const [status, setStatus] = useState(null);
	const [tables, setTables] = useState([]);
	const [selectedTable, setSelectedTable] = useState('');
	const [limit, setLimit] = useState(50);
	const [preview, setPreview] = useState(null);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}),
		[token]
	);

	const fetchStatus = async () => {
		setError('');
		const res = await fetch(`${API_URL}/api/mirror/status`, { headers });
		const data = await res.json();
		if (!res.ok) throw new Error(data?.error || 'No se pudo obtener el estado');
		setStatus(data);
		return data;
	};

	const fetchTables = async () => {
		setError('');
		const res = await fetch(`${API_URL}/api/mirror/tables`, { headers });
		const data = await res.json();
		if (!res.ok) throw new Error(data?.error || 'No se pudieron obtener las tablas');
		setTables(data.tables || []);
		return data.tables || [];
	};

	const fetchPreview = async (tableName, previewLimit) => {
		if (!tableName) {
			setPreview(null);
			return;
		}

		setError('');
		const res = await fetch(
			`${API_URL}/api/mirror/table/${encodeURIComponent(tableName)}?limit=${encodeURIComponent(previewLimit)}`,
			{ headers }
		);
		const data = await res.json();
		if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la vista previa');
		setPreview(data);
	};

	useEffect(() => {
		if (!canAccess) return;

		(async () => {
			try {
				setLoading(true);
				await fetchStatus();
				const t = await fetchTables();
				if (t.length) {
					setSelectedTable(t[0]);
				}
			} catch (e) {
				setError(String(e?.message || e));
			} finally {
				setLoading(false);
			}
		})();
	}, [canAccess]);

	useEffect(() => {
		if (!canAccess) return;
		if (!selectedTable) {
			setPreview(null);
			return;
		}

		(async () => {
			try {
				setLoading(true);
				await fetchPreview(selectedTable, limit);
			} catch (e) {
				setError(String(e?.message || e));
			} finally {
				setLoading(false);
			}
		})();
	}, [canAccess, selectedTable, limit]);

	const isPostgres = String(status?.dialect || '').toLowerCase().startsWith('postgres');
	const setupDisabled = status?.mirror_mode === 'external' || isPostgres;

	const formatConn = (c) => {
		if (!c) return 'N/A';
		if (c.configured && !c.host && !c.port && !c.database) return 'configured';
		const host = c.host || 'localhost';
		const port = c.port ? `:${c.port}` : '';
		const db = c.database ? `/${c.database}` : '';
		return `${host}${port}${db}`;
	};

	const handleSetup = async () => {
		try {
			setMessage('');
			setError('');
			setLoading(true);

			const res = await fetch(`${API_URL}/api/mirror/setup`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ copy_data: true })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'No se pudo configurar la BD espejo');

			setMessage(data?.mensaje || 'BD espejo configurada');
			await fetchStatus();
			const t = await fetchTables();
			if (t.length && !selectedTable) setSelectedTable(t[0]);
		} catch (e) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ display: 'flex' }}>
			<Sidebar />
			<div className="mirror-container main-with-sidebar">
				<div className="mirror-header">
					<h2>Base de Datos Espejo</h2>
				</div>

				{!canAccess ? (
					<div className="mirror-card">
						<p>
							<strong>Acceso denegado.</strong> Solo administrador/supervisor.
						</p>
					</div>
				) : (
					<>
						<div className="mirror-actions">
							<button className="btn-mirror" onClick={handleSetup} disabled={loading || setupDisabled}>
								Configurar / Sincronizar BD espejo
							</button>
							<button
								className="btn-mirror secondary"
								onClick={() => {
									setMessage('');
									setError('');
									fetchStatus();
								}}
								disabled={loading}
							>
								Refrescar estado
							</button>
						</div>

						{status?.mirror_mode === 'external' && (
							<div className="mirror-message error">
								Espejo externo detectado (otro contenedor). La configuración se hace con replicación (publication/subscription), no con este botón.
							</div>
						)}

						{isPostgres && status?.mirror_mode !== 'external' && (
							<div className="mirror-message error">
								En Postgres (modo schema), el espejo se configura automáticamente al iniciar (schema + triggers). Este botón queda deshabilitado.
							</div>
						)}

						{message && <div className="mirror-message success">{message}</div>}
						{error && <div className="mirror-message error">{error}</div>}

						<div className="mirror-grid">
							<div className="mirror-card">
								<h3>Estado</h3>
								{status ? (
									<ul className="mirror-status">
										<li>
											<strong>Motor:</strong> {status.dialect || 'N/A'}
										</li>
										<li>
											<strong>Primary:</strong> {formatConn(status.primary_connection)}
										</li>
										<li>
											<strong>Mirror:</strong> {formatConn(status.mirror_connection)}
										</li>
										<li>
											<strong>Modo:</strong> {status.mirror_mode || 'N/A'}
										</li>
										<li>
											<strong>Schema:</strong> {status.mirror_schema || 'mirror'}
										</li>
										<li>
											<strong>Ruta (solo SQLite):</strong> {status.mirror_path || 'N/A'}
										</li>
										<li>
											<strong>Existe:</strong> {String(!!status.exists)}
										</li>
										<li>
											<strong>Adjunta:</strong> {String(!!status.attached)}
										</li>
										<li>
											<strong>Tablas:</strong> {status.mirror_tables_count ?? 0}
										</li>
										<li>
											<strong>Triggers:</strong> {status.mirror_triggers_count ?? 0}
										</li>
									</ul>
								) : (
									<p>Cargando...</p>
								)}
							</div>

							<div className="mirror-card">
								<h3>Explorar</h3>
								<div className="mirror-form">
									<label>
										Tabla
										<select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} disabled={loading}>
											{tables.map((t) => (
												<option key={t} value={t}>
													{t}
												</option>
											))}
										</select>
									</label>

									<label>
										Límite
										<input
											type="number"
											min={1}
											max={200}
											value={limit}
											onChange={(e) => setLimit(Number(e.target.value || 50))}
											disabled={loading}
										/>
									</label>
								</div>
							</div>
						</div>

						<div className="mirror-card">
							<h3>Vista previa</h3>
							{!preview ? (
								<p>Selecciona una tabla.</p>
							) : preview.rows?.length ? (
								<div className="mirror-table-wrap">
									<table className="mirror-table">
										<thead>
											<tr>
												{preview.columns.map((c) => (
													<th key={c}>{c}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{preview.rows.map((row, idx) => (
												<tr key={idx}>
													{preview.columns.map((c) => (
														<td key={c}>{row?.[c] == null ? '' : String(row[c])}</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p>Sin filas (o límite 0).</p>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

export default MirrorDB;
