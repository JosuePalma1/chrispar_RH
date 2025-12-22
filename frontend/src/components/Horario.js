import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Horario.css';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Horario() {
    const [horarios, setHorarios] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [toastType, setToastType] = useState('success');

    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [horarioActual, setHorarioActual] = useState({
        id_empleado: '',
        turno: 'Matutino',
        dia_laborables: 'Lunes a Viernes',
        hora_entrada: '',
        hora_salida: '',
        descanso_minutos: '60',
        inicio_vigencia: new Date().toISOString().split('T')[0],
        fin_vigencia: ''
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

    const mostrarToast = (mensaje, tipo = 'success') => {
        setToast(mensaje);
        setToastType(tipo);
        setTimeout(() => setToast(null), 5000);
    };

    const parseTimeToMinutes = (timeValue) => {
        if (!timeValue) return NaN;
        const parts = String(timeValue).split(':');
        if (parts.length < 2) return NaN;
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
        return hours * 60 + minutes;
    };

    const getAxiosErrorMessage = (err, fallback) => {
        return (
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            fallback
        );
    };

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
        return new Date(dateStr).toISOString().split('T')[0];
    };

    const CargarEmpleados = async (token) => {
        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const resEmpleados = await axios.get(`${API_URL}/api/empleados/`, config);
            setEmpleados(resEmpleados.data);
        } catch (error) {
            console.error('Error cargando empleados:', error);
            setError('No se pudieron cargar los empleados.');
        }
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró token de autenticación.');
                setLoading(false);
                return;
            }

            const [horariosRes, empleadosRes] = await Promise.all([
                axios.get(`${API_URL}/api/horarios/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/empleados/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            setHorarios(horariosRes.data);
            setEmpleados(empleadosRes.data);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar los datos. Intente más tarde.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getNombreEmpleado = (id_empleado) => {
        const empleado = empleados.find(e => e.id === id_empleado);
        return empleado ? `${empleado.nombres} ${empleado.apellidos}` : 'Desconocido';
    };

    const abrirModal = (horario = null) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('No se encontró token de autenticación.');
            return;
        }
        CargarEmpleados(token); // Cargar empleados cada vez que se abre el modal
        if (horario) {
            setModoEdicion(true);
            const employeeName = empleados.find(e => e.id === horario.id_empleado);
            setEmployeeSearchQuery(employeeName ? `${employeeName.nombres} ${employeeName.apellidos}` : '');
            setHorarioActual({
                ...horario,
                hora_entrada: horario.hora_entrada ? horario.hora_entrada.substring(0, 5) : '',
                hora_salida: horario.hora_salida ? horario.hora_salida.substring(0, 5) : '',
                inicio_vigencia: formatDateForInput(horario.inicio_vigencia),
                fin_vigencia: formatDateForInput(horario.fin_vigencia)
            });
        } else {
            setModoEdicion(false);
            setEmployeeSearchQuery('');
            setHorarioActual({
                id_empleado: '',
                turno: 'Matutino',
                dia_laborables: 'Lunes a Viernes',
                hora_entrada: '',
                hora_salida: '',
                descanso_minutos: '60',
                inicio_vigencia: new Date().toISOString().split('T')[0],
                fin_vigencia: ''
            });
        }
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setEmployeeSearchQuery('');
        setFilteredEmployees([]);
        // Si el modal se cierra sin guardar, resetear el error local del modal
        setError(null); 
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setHorarioActual(prev => ({ ...prev, [name]: value }));
    };

    const handleEmployeeSearchChange = (e) => {
        const query = e.target.value;
        setEmployeeSearchQuery(query);

        // Ordenar empleados alfabéticamente una sola vez
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
            // Si no hay búsqueda, mostrar todos los empleados ordenados
            setFilteredEmployees(sortedEmpleados);
        }
    };

    const handleEmployeeSearchFocus = () => {
        setIsEmployeeSearchFocused(true);
        // Ordenar y mostrar todos los empleados al enfocar
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
        setHorarioActual(prev => ({ ...prev, id_empleado: employee.id }));
        setEmployeeSearchQuery(`${employee.nombres} ${employee.apellidos}`);
        setFilteredEmployees([]);
        setIsEmployeeSearchFocused(false);
    };

    const guardarHorario = async (e) => {
        e.preventDefault();

        const timeToMinutes = (value) => {
            if (!value) return null;
            const parts = String(value).split(':');
            const h = parseInt(parts[0] || '0', 10);
            const m = parseInt(parts[1] || '0', 10);
            return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
        };

        if (!horarioActual.id_empleado) {
            mostrarToast('Debe seleccionar un empleado de la lista.', 'error');
            return;
        }

        if (!horarioActual.hora_entrada || !horarioActual.hora_salida) {
            mostrarToast('Las horas de entrada y salida son requeridas.', 'error');
            return;
        }

        if (horarioActual.hora_entrada === horarioActual.hora_salida) {
            mostrarToast('La hora de entrada y la hora de salida no pueden ser iguales.', 'error');
            return;
        }

        // Validación de orden de horas (excepto turno nocturno)
        const turnoLower = (horarioActual.turno || '').trim().toLowerCase();
        const entradaMin = parseTimeToMinutes(horarioActual.hora_entrada);
        const salidaMin = parseTimeToMinutes(horarioActual.hora_salida);
        if (turnoLower !== 'nocturno' && Number.isFinite(entradaMin) && Number.isFinite(salidaMin) && salidaMin < entradaMin) {
            mostrarToast('La hora de salida no puede ser anterior a la hora de entrada', 'error');
            return;
        }

        const turno = String(horarioActual.turno || '').trim().toLowerCase();
        const entradaMin = timeToMinutes(horarioActual.hora_entrada);
        const salidaMin = timeToMinutes(horarioActual.hora_salida);
        if (turno !== 'nocturno' && entradaMin !== null && salidaMin !== null && salidaMin < entradaMin) {
            mostrarToast('La hora de salida no puede ser anterior a la hora de entrada.', 'error');
            return;
        }

        // Validación de fechas
        if (horarioActual.inicio_vigencia && horarioActual.fin_vigencia) {
            const inicio = new Date(horarioActual.inicio_vigencia);
            const fin = new Date(horarioActual.fin_vigencia);
            if (fin < inicio) {
                mostrarToast('La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.', 'error');
                return;
            }
        }

        const dataToSend = {
            ...horarioActual,
            id_empleado: parseInt(horarioActual.id_empleado, 10),
            descanso_minutos: horarioActual.descanso_minutos ? parseInt(horarioActual.descanso_minutos, 10) : null,
            fin_vigencia: horarioActual.fin_vigencia || null
        };

        const token = localStorage.getItem('token');
        const url = modoEdicion
            ? `${API_URL}/api/horarios/${horarioActual.id_horario}`
            : `${API_URL}/api/horarios/`;
        const method = modoEdicion ? 'put' : 'post';

        try {
            await axios[method](url, dataToSend, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            mostrarToast(modoEdicion ? 'Horario actualizado exitosamente.' : 'Horario creado exitosamente.', 'success');
            cargarDatos();
            cerrarModal();
        } catch (error) {
            console.error('Error al guardar el horario:', error);
            if (error.response && error.response.data && error.response.data.error) {
                mostrarToast(`Error: ${error.response.data.error}`, 'error');
            } else {
                mostrarToast('No se pudo guardar el horario. Verifique los datos o contacte al administrador.', 'error');
            }
        }
    };

    const eliminarHorario = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este horario?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/horarios/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                mostrarToast('Horario eliminado exitosamente.', 'success');
                cargarDatos();
            } catch (error) {
                console.error('Error al eliminar el horario:', error);
                mostrarToast(`Error: ${getAxiosErrorMessage(error, 'No se pudo eliminar el horario.')}`, 'error');
            }
        }
    };

    // --- Funciones de ordenamiento, filtrado y paginación ---
    const ordenarPor = (campo) => {
        const direccion = ordenamiento.campo === campo && ordenamiento.direccion === 'asc' ? 'desc' : 'asc';
        setOrdenamiento({ campo, direccion });
    };

    const filtrarYOrdenarHorarios = () => {
        let resultado = [...horarios];

        // Filtrado por búsqueda
        if (busqueda) {
            const busquedaLower = busqueda.toLowerCase();
            resultado = resultado.filter(horario => {
                const nombreEmpleado = getNombreEmpleado(horario.id_empleado).toLowerCase();
                return (
                    nombreEmpleado.includes(busquedaLower) ||
                    horario.turno.toLowerCase().includes(busquedaLower) ||
                    horario.dia_laborables.toLowerCase().includes(busquedaLower) ||
                    horario.hora_entrada.includes(busquedaLower) ||
                    horario.hora_salida.includes(busquedaLower)
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
                
                // Manejar valores nulos o indefinidos para ordenamiento
                if (valorA == null) valorA = '';
                if (valorB == null) valorB = '';

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

    const registrosFiltrados = filtrarYOrdenarHorarios();
    const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = indiceInicio + registrosPorPagina;
    const registrosPaginados = registrosFiltrados.slice(indiceInicio, indiceFin);

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="usuarios-container">
                <div className="usuarios-header">
                    <h2>Gestión de Horarios</h2>
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
                            placeholder="Buscar por empleado, turno, días laborables..."
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
                                <th onClick={() => ordenarPor('turno')} className="th-sortable">
                                    Turno {ordenamiento.campo === 'turno' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('dia_laborables')} className="th-sortable">
                                    Días Lab. {ordenamiento.campo === 'dia_laborables' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('hora_entrada')} className="th-sortable">
                                    Entrada {ordenamiento.campo === 'hora_entrada' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('hora_salida')} className="th-sortable">
                                    Salida {ordenamiento.campo === 'hora_salida' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('descanso_minutos')} className="th-sortable">
                                    Descanso {ordenamiento.campo === 'descanso_minutos' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('inicio_vigencia')} className="th-sortable">
                                    Inicio Vig. {ordenamiento.campo === 'inicio_vigencia' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => ordenarPor('fin_vigencia')} className="th-sortable">
                                    Fin Vig. {ordenamiento.campo === 'fin_vigencia' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="th-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrosPaginados.length > 0 ? registrosPaginados.map(horario => (
                                <tr key={horario.id_horario}>
                                    <td>{getNombreEmpleado(horario.id_empleado)}</td>
                                    <td>{horario.turno}</td>
                                    <td>{horario.dia_laborables}</td>
                                    <td>{horario.hora_entrada}</td>
                                    <td>{horario.hora_salida}</td>
                                    <td>{horario.descanso_minutos}</td>
                                    <td>{horario.inicio_vigencia ? new Date(horario.inicio_vigencia).toLocaleDateString() : 'N/A'}</td>
                                    <td>{horario.fin_vigencia ? new Date(horario.fin_vigencia).toLocaleDateString() : 'N/A'}</td>
                                    <td className="td-center">
                                        <div className="acciones-grupo">
                                            <button className="btn-icono editar" onClick={() => abrirModal(horario)} title="Editar">
                                                <FaEdit />
                                            </button>
                                            <button className="btn-icono eliminar" onClick={() => eliminarHorario(horario.id_horario)} title="Eliminar">
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="9" className="no-data">No hay horarios que mostrar</td>
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
                <div className={`horario-toast toast-${toastType}`}>
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
                            <h3>{modoEdicion ? 'Editar Horario' : 'Nuevo Horario'}</h3>
                        </div>
                        <form onSubmit={guardarHorario} autoComplete="off">
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
                                            required={!horarioActual.id_empleado}
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
                            <div className="form-grupo">
                                <label>Turno</label>
                                <select name="turno" value={horarioActual.turno} onChange={handleChange}>
                                    <option value="Matutino">Matutino</option>
                                    <option value="Vespertino">Vespertino</option>
                                    <option value="Nocturno">Nocturno</option>
                                </select>
                            </div>
                            <div className="form-grupo">
                                <label>Días Laborables</label>
                                <input type="text" name="dia_laborables" value={horarioActual.dia_laborables} onChange={handleChange} placeholder="Ej: Lunes a Viernes" />
                            </div>
                             <div className="form-row">
                                <div className="form-grupo">
                                    <label>Inicio de Vigencia</label>
                                    <input type="date" name="inicio_vigencia" value={horarioActual.inicio_vigencia} onChange={handleChange} required />
                                </div>
                                <div className="form-grupo">
                                    <label>Fin de Vigencia (Opcional)</label>
                                    <input type="date" name="fin_vigencia" value={horarioActual.fin_vigencia} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-grupo">
                                    <label>Hora de Entrada</label>
                                    <input type="time" name="hora_entrada" value={horarioActual.hora_entrada} onChange={handleChange} required />
                                </div>
                                <div className="form-grupo">
                                    <label>Hora de Salida</label>
                                    <input type="time" name="hora_salida" value={horarioActual.hora_salida} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-grupo">
                                <label>Descanso (minutos)</label>
                                <input type="number" name="descanso_minutos" value={horarioActual.descanso_minutos} onChange={handleChange} />
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

export default Horario;