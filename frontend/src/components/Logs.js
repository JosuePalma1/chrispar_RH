import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Logs.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    tabla: '',
    operacion: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  // Paginación
  const [paginacion, setPaginacion] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [logSeleccionado, setLogSeleccionado] = useState(null);

  useEffect(() => {
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginacion.page, paginacion.per_page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Construir parámetros
      const params = new URLSearchParams({
        page: paginacion.page,
        per_page: paginacion.per_page
      });
      
      if (filtros.tabla) params.append('tabla', filtros.tabla);
      if (filtros.operacion) params.append('operacion', filtros.operacion);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      
      const res = await axios.get(`${API_URL}/api/logs/?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setLogs(res.data.logs);
      setPaginacion({
        ...paginacion,
        total: res.data.total,
        total_pages: res.data.total_pages,
        has_next: res.data.has_next,
        has_prev: res.data.has_prev
      });
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Sesión expirada. Por favor inicie sesión nuevamente.');
      } else {
        setError('Error al cargar logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    setPaginacion({ ...paginacion, page: 1 });
    fetchLogs();
  };

  const handleLimpiarFiltros = () => {
    setFiltros({ 
      tabla: '', 
      operacion: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
    setPaginacion({ ...paginacion, page: 1 });
    setTimeout(() => fetchLogs(), 100);
  };

  const handleCambiarPagina = (nuevaPagina) => {
    setPaginacion({ ...paginacion, page: nuevaPagina });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCambiarPerPage = (e) => {
    setPaginacion({ 
      ...paginacion, 
      per_page: parseInt(e.target.value),
      page: 1
    });
  };

  const handleVerDetalles = (log) => {
    setLogSeleccionado(log);
    setModalVisible(true);
  };

  const handleCerrarModal = () => {
    setModalVisible(false);
    setLogSeleccionado(null);
  };

  const getBadgeColor = (operacion) => {
    const colores = {
      'INSERT': 'badge-success',
      'UPDATE': 'badge-warning',
      'DELETE': 'badge-danger',
      'LOGIN': 'badge-info'
    };
    return colores[operacion] || 'badge-secondary';
  };

  const getBadgeTabla = (tabla) => {
    const colores = {
      'empleados': 'badge-tabla-purple',
      'cargos': 'badge-tabla-cyan',
      'usuarios': 'badge-tabla-indigo',
      'horarios': 'badge-tabla-pink',
      'hojas_vida': 'badge-tabla-orange',
      'asistencias': 'badge-tabla-green',
      'permisos': 'badge-tabla-yellow',
      'nominas': 'badge-tabla-red',
      'rubros': 'badge-tabla-blue'
    };
    return colores[tabla] || 'badge-tabla-gray';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generarBotonesPaginacion = () => {
    const botones = [];
    const maxBotones = 5;
    let inicio = Math.max(1, paginacion.page - 2);
    let fin = Math.min(paginacion.total_pages, inicio + maxBotones - 1);
    
    if (fin - inicio < maxBotones - 1) {
      inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      botones.push(
        <button
          key={i}
          onClick={() => handleCambiarPagina(i)}
          className={`btn-pagina ${paginacion.page === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    
    return botones;
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="logs-container main-with-sidebar">
        {/* Header con botones de exportar */}
        <div className="logs-header">
          <h2>Auditoría de Transacciones</h2>
        </div>

        {/* Filtros */}
        <div className="logs-filtros">
          <select 
            value={filtros.tabla} 
            onChange={(e) => setFiltros({...filtros, tabla: e.target.value})}
            className="filtro-select"
          >
            <option value="">Todas las tablas</option>
            <option value="empleados">Empleados</option>
            <option value="cargos">Cargos</option>
            <option value="usuarios">Usuarios</option>
            <option value="horarios">Horarios</option>
            <option value="hojas_vida">Hojas de Vida</option>
            <option value="asistencias">Asistencias</option>
            <option value="permisos">Permisos</option>
            <option value="nominas">Nóminas</option>
            <option value="rubros">Rubros</option>
          </select>

          <select 
            value={filtros.operacion} 
            onChange={(e) => setFiltros({...filtros, operacion: e.target.value})}
            className="filtro-select"
          >
            <option value="">Todas las operaciones</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
          </select>

          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltros({...filtros, fecha_desde: e.target.value})}
            className="filtro-fecha"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltros({...filtros, fecha_hasta: e.target.value})}
            className="filtro-fecha"
            placeholder="Hasta"
          />

          <button onClick={handleFiltrar} className="btn-filtrar">
            🔍 Buscar
          </button>
          <button onClick={handleLimpiarFiltros} className="btn-limpiar">
            🔄 Limpiar
          </button>
        </div>

        {/* Selector de registros por página */}
        <div className="paginacion-controles-superior">
          <label>
            Mostrar: 
            <select 
              value={paginacion.per_page} 
              onChange={handleCambiarPerPage}
              className="select-per-page"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            registros por página
          </label>
          <span className="total-registros">
            Total: <strong>{paginacion.total}</strong> registros
          </span>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>Cargando logs...</p>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha/Hora</th>
                    <th>Usuario</th>
                    <th>Tabla</th>
                    <th>Operación</th>
                    <th className="th-center">Registro</th>
                    <th className="th-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No hay logs registrados
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{formatearFecha(log.fecha_hora)}</td>
                        <td>{log.usuario}</td>
                        <td>
                          <span className={`badge ${getBadgeTabla(log.tabla_afectada)}`}>
                            {log.tabla_afectada}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getBadgeColor(log.operacion)}`}>
                            {log.operacion}
                          </span>
                        </td>
                        <td className="td-center">{log.id_registro}</td>
                        <td className="td-center">
                          <button 
                            className="btn-ver" 
                            onClick={() => handleVerDetalles(log)}
                          >
                            👁️ Ver
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {paginacion.total_pages > 1 && (
              <div className="paginacion">
                <button
                  onClick={() => handleCambiarPagina(paginacion.page - 1)}
                  disabled={!paginacion.has_prev}
                  className="btn-paginacion"
                >
                  ◀ Anterior
                </button>
                
                <div className="numeros-pagina">
                  {generarBotonesPaginacion()}
                </div>
                
                <button
                  onClick={() => handleCambiarPagina(paginacion.page + 1)}
                  disabled={!paginacion.has_next}
                  className="btn-paginacion"
                >
                  Siguiente ▶
                </button>
              </div>
            )}

            <div className="info-paginacion">
              Mostrando <strong>{logs.length > 0 ? ((paginacion.page - 1) * paginacion.per_page + 1) : 0}</strong> - <strong>{Math.min(paginacion.page * paginacion.per_page, paginacion.total)}</strong> de <strong>{paginacion.total}</strong> registros
            </div>
          </>
        )}

        {/* Modal */}
        {modalVisible && logSeleccionado && (
          <div className="modal-overlay" onClick={handleCerrarModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>📄 Detalle del Log #{logSeleccionado.id}</h3>
              <div className="modal-body">
                <p><strong>🕐 Fecha:</strong> {formatearFecha(logSeleccionado.fecha_hora)}</p>
                <p><strong>👤 Usuario:</strong> {logSeleccionado.usuario}</p>
                <p><strong>📋 Tabla:</strong> {logSeleccionado.tabla_afectada}</p>
                <p><strong>🔧 Operación:</strong> {logSeleccionado.operacion}</p>
                <p><strong>🆔 ID Registro:</strong> {logSeleccionado.id_registro}</p>

                {logSeleccionado.datos_anteriores && logSeleccionado.operacion !== 'INSERT' && (
                  <div className="datos-section">
                    <h4>📦 Datos Anteriores:</h4>
                    <pre>{JSON.stringify(JSON.parse(logSeleccionado.datos_anteriores), null, 2)}</pre>
                  </div>
                )}

                {logSeleccionado.datos_nuevos && logSeleccionado.operacion !== 'DELETE' && (
                  <div className="datos-section">
                    <h4>📦 Datos Nuevos:</h4>
                    <pre>{JSON.stringify(JSON.parse(logSeleccionado.datos_nuevos), null, 2)}</pre>
                  </div>
                )}
              </div>
              <button className="btn-cerrar" onClick={handleCerrarModal}>
                ❌ Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Logs;