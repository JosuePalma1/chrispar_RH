import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './HojaDeVida.css';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function HojaDeVida() {
    const [hojasVida, setHojasVida] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [registroActual, setRegistroActual] = useState({
        id_empleado: '',
        tipo: 'Educacion',
        nombre_documento: '',
        institucion: '',
        fecha_inicio: '',
        fecha_finalizacion: '',
    });

    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [isEmployeeSearchFocused, setIsEmployeeSearchFocused] = useState(false);

    // --- Nuevos estados para paginación, búsqueda y ordenamiento ---
    const [busqueda, setBusqueda] = useState('');
    const [ordenamiento, setOrdenamiento] = useState({ campo: null, direccion: 'asc' });
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 5;
    const modalRef = useRef(null);

    useEffect(() => {
        cargarDatos();
    }, []);
    
    // Cerrar modal al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            cerrarModal();
        }
        };

        if (mostrarModal) {
        document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [mostrarModal]);


    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    };
    
    const CargarEmpleados = async (token, config) => {
        const resEmpleados = await axios.get(`${API_URL}/api/empleados/`, config)
        setEmpleados(resEmpleados.data);
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró token de autenticación.');
                return;
            }
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const [resHojas, resEmpleados] = await Promise.all([
                axios.get(`${API_URL}/api/hojas-vida/`, config),
                axios.get(`${API_URL}/api/empleados/`, config)
            ]);
            setHojasVida(resHojas.data);
            setEmpleados(resEmpleados.data);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar los datos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (registro = null) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('No se encontró token de autenticación.');
            return;
        }
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        CargarEmpleados(token, config);
        if (registro) {
            setModoEdicion(true);
            const employeeName = empleados.find(e => e.id === registro.id_empleado);
            setEmployeeSearchQuery(employeeName ? `${employeeName.nombres} ${employeeName.apellidos}` : '');
            setRegistroActual({
                ...registro,
                fecha_inicio: formatDateForInput(registro.fecha_inicio),
                fecha_finalizacion: formatDateForInput(registro.fecha_finalizacion),
            });
        } else {
            setModoEdicion(false);
            setEmployeeSearchQuery('');
            setRegistroActual({
                id_empleado: '',
                tipo: 'Educacion',
                nombre_documento: '',
                institucion: '',
                fecha_inicio: '',
                fecha_finalizacion: '',
            });
        }
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setEmployeeSearchQuery('');
        setFilteredEmployees([]);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setRegistroActual(prev => ({ ...prev, [name]: value }));
    };

    const handleEmployeeSearchChange = (e) => {
        const query = e.target.value;
        setEmployeeSearchQuery(query);

        const sortedEmpleados = [...empleados].sort((a, b) => {
            const nameA = `${a.nombres} ${a.apellidos}`.toLowerCase();
            const nameB = `${b.nombres} ${b.apellidos}`.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        if (query) {
            const filtered = sortedEmpleados.filter(emp =>
                `${emp.nombres} ${emp.apellidos}`.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredEmployees(filtered);
        } else {
            setFilteredEmployees(sortedEmpleados);
        }
    };

    const handleEmployeeSearchFocus = () => {
        setIsEmployeeSearchFocused(true);
        const sortedEmpleados = [...empleados].sort((a, b) => {
            const nameA = `${a.nombres} ${a.apellidos}`.toLowerCase();
            const nameB = `${b.nombres} ${b.apellidos}`.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        setFilteredEmployees(sortedEmpleados);
    };

    const handleSelectEmployee = (employee) => {
        setRegistroActual(prev => ({ ...prev, id_empleado: employee.id }));
        setEmployeeSearchQuery(`${employee.nombres} ${employee.apellidos}`);
        setFilteredEmployees([]);
        setIsEmployeeSearchFocused(false);
    };

    const guardarRegistro = async (e) => {
        e.preventDefault();

        if (!registroActual.id_empleado) {
            setError("Debe seleccionar un empleado de la lista.");
            return;
        }

        // Validación de fechas
        if (registroActual.fecha_inicio && registroActual.fecha_finalizacion) {
            const inicio = new Date(registroActual.fecha_inicio);
            const fin = new Date(registroActual.fecha_finalizacion);
            if (fin < inicio) {
                setToast("La fecha de finalización no puede ser anterior a la fecha de inicio.");
                setTimeout(() => setToast(null), 5000); // Ocultar el toast después de 5 segundos
                return;
            }
        }

        const dataToSend = {
            ...registroActual,
            id_empleado: parseInt(registroActual.id_empleado, 10),
            fecha_inicio: registroActual.fecha_inicio || null,
            fecha_finalizacion: registroActual.fecha_finalizacion || null,
        };

        const token = localStorage.getItem('token');
        const url = modoEdicion
            ? `${API_URL}/api/hojas-vida/${registroActual.id_hoja_vida}`
            : `${API_URL}/api/hojas-vida/`;
        const method = modoEdicion ? 'put' : 'post';

        try {
            await axios[method](url, dataToSend, { headers: { 'Authorization': `Bearer ${token}` } });
            cargarDatos();
            cerrarModal();
        } catch (error) {
            console.error('Error guardando registro:', error);
            setError('No se pudo guardar el registro.');
        }
    };

    const eliminarRegistro = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este registro?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/hojas-vida/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                cargarDatos();
            } catch (error) {
                console.error('Error eliminando registro:', error);
                setError('No se pudo eliminar el registro.');
            }
        }
    };

    // --- Funciones de ordenamiento, filtrado y paginación ---
    const ordenarPor = (campo) => {
        const direccion = ordenamiento.campo === campo && ordenamiento.direccion === 'asc' ? 'desc' : 'asc';
        setOrdenamiento({ campo, direccion });
    };

    const getNombreEmpleado = (id_empleado) => {
        const empleado = empleados.find(e => e.id === id_empleado);
        return empleado ? `${empleado.nombres} ${empleado.apellidos}` : 'Desconocido';
    };

    const filtrarYOrdenarHojasVida = () => {
        let resultado = [...hojasVida];

        // Filtrado por búsqueda
        if (busqueda) {
            const busquedaLower = busqueda.toLowerCase();
            resultado = resultado.filter(registro => {
                const nombreEmpleado = getNombreEmpleado(registro.id_empleado).toLowerCase();
                return (
                    nombreEmpleado.includes(busquedaLower) ||
                    registro.nombre_documento.toLowerCase().includes(busquedaLower) ||
                    registro.tipo.toLowerCase().includes(busquedaLower) ||
                    (registro.institucion && registro.institucion.toLowerCase().includes(busquedaLower))
                );
            });
        }

        // Ordenamiento
        if (ordenamiento.campo) {
            resultado.sort((a, b) => {
                let valorA, valorB;

                if (ordenamiento.campo === 'empleado') {
                    valorA = getNombreEmpleado(a.id_empleado).toLowerCase();
                    valorB = getNombreEmpleado(b.id_empleado).toLowerCase();
                } else {
                    valorA = a[ordenamiento.campo];
                    valorB = b[ordenamiento.campo];
                }

                if (valorA < valorB) return ordenamiento.direccion === 'asc' ? -1 : 1;
                if (valorA > valorB) return ordenamiento.direccion === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return resultado;
    };

    const cambiarPagina = (numeroPagina) => {
        setPaginaActual(numeroPagina);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="usuarios-container">Cargando...</div>
        </div>
    );

    const registrosFiltrados = filtrarYOrdenarHojasVida();
    const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = indiceInicio + registrosPorPagina;
    const registrosPaginados = registrosFiltrados.slice(indiceInicio, indiceFin);

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="usuarios-container">
                <div className="usuarios-header">
                    <h2>Gestión de Hojas de Vida</h2>
                    <div className="header-actions">
                        <button className="btn-nuevo" onClick={() => abrirModal()}>
                            <FaPlus /> 
                        </button>
                    </div>
                </div>

                {error && <div className="error-banner" onClick={() => setError(null)}>{error}</div>}

                <div className="busqueda-seccion">
                    <div className="busqueda-wrapper">
                        <input
                            type="text"
                            placeholder="Buscar por empleado, documento, tipo..."
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                            className="input-busqueda"
                        />
                    </div>
                    <span className="resultados-info">
                        Mostrando <strong>{registrosPaginados.length}</strong> de <strong>{registrosFiltrados.length}</strong> registros
                    </span>
                </div>

                <div className="tabla-responsive">
                    <table className="usuarios-tabla">
                        <thead>
                            <tr>
                                <th onClick={() => ordenarPor('empleado')} className="th-sortable">
                                    Empleado {ordenamiento.campo === 'empleado' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('nombre_documento')} className="th-sortable">
                                    Documento {ordenamiento.campo === 'nombre_documento' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('tipo')} className="th-sortable">
                                    Tipo {ordenamiento.campo === 'tipo' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('institucion')} className="th-sortable">
                                    Institución {ordenamiento.campo === 'institucion' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="th-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrosPaginados.length > 0 ? registrosPaginados.map(registro => (
                                <tr key={registro.id_hoja_vida}>
                                    <td>{getNombreEmpleado(registro.id_empleado)}</td>
                                    <td>{registro.nombre_documento}</td>
                                    <td>{registro.tipo}</td>
                                    <td>{registro.institucion}</td>
                                    <td className="td-center">
                                        <div className="acciones-grupo">
                                            <button className="btn-icono editar" onClick={() => abrirModal(registro)} title="Editar">
                                                <FaEdit />
                                            </button>
                                            <button className="btn-icono eliminar" onClick={() => eliminarRegistro(registro.id_hoja_vida)} title="Eliminar">
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="no-data">No hay registros que mostrar</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {registrosFiltrados.length > 0 && (
                    <div className="paginacion">
                        <div className="paginacion-controles">
                            <button
                                className="btn-paginacion"
                                onClick={() => cambiarPagina(paginaActual - 1)}
                                disabled={paginaActual === 1}
                            >
                                Anterior
                            </button>
                            <div className="numeros-pagina">
                                {[...Array(totalPaginas)].map((_, index) => (
                                    <button
                                        key={index + 1}
                                        className={`btn-numero ${paginaActual === index + 1 ? 'activo' : ''}`}
                                        onClick={() => cambiarPagina(index + 1)}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="btn-paginacion"
                                onClick={() => cambiarPagina(paginaActual + 1)}
                                disabled={paginaActual === totalPaginas}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {toast && (
                <div className="toast">
                    {toast}
                </div>
            )}

            {mostrarModal && (
                <div className="modal">
                    <div className="modal-contenido" ref={modalRef}>
                        <button className="btn-cerrar-modal" onClick={cerrarModal} type="button">
                            <FaTimes />
                        </button>
                        <div className="modal-header">
                            <h3>{modoEdicion ? 'Editar Hoja de Vida' : 'Nueva Hoja de Vida'}</h3>
                        </div>
                        <form onSubmit={guardarRegistro} autoComplete="off">
                            <div className="form-grupo">
                                <label>Empleado</label>
                                {modoEdicion ? (
                                    <input type="text" value={employeeSearchQuery} readOnly disabled />
                                ) : (
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            value={employeeSearchQuery}
                                            onChange={handleEmployeeSearchChange}
                                            onFocus={handleEmployeeSearchFocus}
                                            onBlur={() => setTimeout(() => setIsEmployeeSearchFocused(false), 200)}
                                            placeholder="Buscar empleado por nombre..."
                                            required={!registroActual.id_empleado}
                                        />
                                        {isEmployeeSearchFocused && (
                                            <ul className="search-results">
                                                {filteredEmployees.length > 0 ? (
                                                    filteredEmployees.map(emp => (
                                                        <li key={emp.id} onClick={() => handleSelectEmployee(emp)}>
                                                            {emp.nombres} {emp.apellidos}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="no-results">No se encontraron empleados.</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-row">
                                <div className="form-grupo">
                                    <label>Tipo de Registro</label>
                                    <select name="tipo" value={registroActual.tipo} onChange={handleChange}>
                                        <option value="Educacion">Educación</option>
                                        <option value="Experiencia">Experiencia Laboral</option>
                                        <option value="Certificacion">Certificación</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="form-grupo">
                                    <label>Nombre del Documento/Título</label>
                                    <input type="text" name="nombre_documento" value={registroActual.nombre_documento} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-grupo">
                                <label>Institución o Empresa</label>
                                <input type="text" name="institucion" value={registroActual.institucion} onChange={handleChange} />
                            </div>
                            <div className="form-row">
                                <div className="form-grupo">
                                    <label>Fecha de Inicio</label>
                                    <input type="date" name="fecha_inicio" value={registroActual.fecha_inicio} onChange={handleChange} />
                                </div>
                                <div className="form-grupo">
                                    <label>Fecha de Finalización</label>
                                    <input type="date" name="fecha_finalizacion" value={registroActual.fecha_finalizacion} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-botones">
                                <button type="submit" className="btn-guardar">Guardar</button>
                                <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HojaDeVida;