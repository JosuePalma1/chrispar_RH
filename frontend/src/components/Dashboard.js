import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Dashboard.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Dashboard() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [profileMenuView, setProfileMenuView] = useState('main');
    const profileMenuRef = useRef(null);

    const [toast, setToast] = useState(null);
    const [toastType, setToastType] = useState('success');

    const [perfilUsername, setPerfilUsername] = useState('');
    const [passwordActual, setPasswordActual] = useState('');
    const [passwordNueva, setPasswordNueva] = useState('');
    const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
    const [empleados, setEmpleados] = useState([]);
    const [empleadosPageIndex, setEmpleadosPageIndex] = useState(0);
    const [cargos, setCargos] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [estadisticas, setEstadisticas] = useState({
        totalEmpleados: 0,
        empleadosActivos: 0,
        empleadosInactivos: 0,
        totalCargos: 0,
        promedioSueldo: 0
    });

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/');
            return;
        }

        // Decodificar el JWT para obtener la información del usuario
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUsuario({
                username: payload.username,
                rol: payload.rol,
                id: payload.user_id
            });
            setPerfilUsername(payload.username || '');
        } catch (error) {
            console.error('Error al decodificar token:', error);
            localStorage.removeItem('token');
            navigate('/');
            return;
        }

        cargarDatos(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

        useEffect(() => {
        if (empleados.length > 0 && cargos.length > 0) {
            calcularEstadisticas(empleados, cargos);
        }
    }, [empleados, cargos]);

    const mostrarToast = (mensaje, tipo = 'success') => {
        setToast(mensaje);
        setToastType(tipo);
        setTimeout(() => setToast(null), 5000);
    };

    const getTokenPayload = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch {
            return null;
        }
    };

    const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState(null);

    useEffect(() => {
        const update = () => {
            const exp = getTokenPayload()?.exp;
            if (!exp) {
                setSessionRemainingSeconds(null);
                return;
            }
            const remaining = Math.max(0, Math.floor(exp - Date.now() / 1000));
            setSessionRemainingSeconds(remaining);
        };

        update();
        const id = setInterval(update, 30_000);
        return () => clearInterval(id);
    }, []);

    const sessionStatus = useMemo(() => {
        if (sessionRemainingSeconds == null) {
            return { label: 'Sesión activa', variant: 'ok' };
        }

        const minutes = Math.ceil(sessionRemainingSeconds / 60);
        if (sessionRemainingSeconds <= 5 * 60) {
            return { label: `Sesión por expirar (${minutes} min)`, variant: 'warn' };
        }
        return { label: `Sesión activa (${minutes} min)`, variant: 'ok' };
    }, [sessionRemainingSeconds]);

    useEffect(() => {
        if (!profileMenuOpen) return;

        const onMouseDown = (event) => {
            if (!profileMenuRef.current) return;
            if (!profileMenuRef.current.contains(event.target)) {
                setProfileMenuOpen(false);
                setProfileMenuView('main');
            }
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setProfileMenuOpen(false);
                setProfileMenuView('main');
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [profileMenuOpen]);

    const EMPLEADOS_PAGE_SIZE = 8;
    const empleadosTotalPages = Math.max(1, Math.ceil(empleados.length / EMPLEADOS_PAGE_SIZE));
    const empleadosPageStart = empleadosPageIndex * EMPLEADOS_PAGE_SIZE;
    const empleadosPageEndExclusive = Math.min(empleadosPageStart + EMPLEADOS_PAGE_SIZE, empleados.length);
    const empleadosPaginaActual = empleados.slice(empleadosPageStart, empleadosPageEndExclusive);

    useEffect(() => {
        if (empleadosPageIndex > empleadosTotalPages - 1) {
            setEmpleadosPageIndex(Math.max(empleadosTotalPages - 1, 0));
        }
        if (empleados.length > 0 && empleadosPageIndex < 0) {
            setEmpleadosPageIndex(0);
        }
    }, [empleados.length, empleadosPageIndex, empleadosTotalPages]);

    const cargarDatos = async (token) => {
        await Promise.all([
            cargarEmpleados(token),
            cargarCargos(token),
            cargarAsistencias(token)
        ]);
    };

    const cargarCargos = async (token) => {
        try {
            const respuesta = await fetch(`${API_URL}/api/cargos/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (respuesta.ok) {
                const data = await respuesta.json();
                setCargos(data);
                calcularEstadisticas(empleados, data);
            }
        } catch (err) {
            console.error('Error al cargar cargos:', err);
        }
    };

    const cargarAsistencias = async (token) => {
        try {
            const respuesta = await fetch(`${API_URL}/api/asistencias/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (respuesta.ok) {
                const data = await respuesta.json();
                setAsistencias(data);
            }
        } catch (err) {
            console.error('Error al cargar asistencias:', err);
        }
    };

    const cargarEmpleados = async (token) => {
        try {
            setCargando(true);
            
            const respuesta = await fetch(`${API_URL}/api/empleados/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!respuesta.ok) {
                if (respuesta.status === 401) {
                    const errorData = await respuesta.json();
                    alert(`Sesión expirada: ${errorData.error || 'Token inválido'}`);
                    localStorage.removeItem('token');
                    navigate('/');
                    return;
                }
                throw new Error('Error al cargar empleados');
            }

            const data = await respuesta.json();
            setEmpleados(data);
            setEmpleadosPageIndex(0);
            setError(null);
            calcularEstadisticas(data, cargos);
            
        } catch (err) {
            console.error('Error:', err);
            setError('No se pudieron cargar los empleados');
        } finally {
            setCargando(false);
        }
    };

    const calcularEstadisticas = (empleadosData, cargosData) => {
        if (empleadosData.length === 0) return;

        const activos = empleadosData.filter(e => e.estado === 'Activo').length;
        const inactivos = empleadosData.filter(e => e.estado === 'Inactivo').length;
        
        let totalSueldo = 0;
        empleadosData.forEach(emp => {
            const cargo = cargosData.find(c => c.id === emp.cargo_id);
            if (cargo) {
                totalSueldo += parseFloat(cargo.sueldo_base || 0);
            }
        });

        setEstadisticas({
            totalEmpleados: empleadosData.length,
            empleadosActivos: activos,
            empleadosInactivos: inactivos,
            totalCargos: cargosData.length,
            promedioSueldo: empleadosData.length > 0 ? parseFloat((totalSueldo / empleadosData.length).toFixed(2)) : 0
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const guardarPerfil = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            handleLogout();
            return;
        }

        const username = (perfilUsername || '').trim();
        if (!username) {
            mostrarToast('El username es requerido.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/usuarios/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username })
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                mostrarToast(`Error: ${body.error || 'No se pudo actualizar el perfil'}`, 'error');
                return;
            }

            if (body.token) {
                localStorage.setItem('token', body.token);
            }

            setUsuario((prev) => prev ? ({ ...prev, username: body.usuario?.username || username }) : prev);
            mostrarToast('Perfil actualizado exitosamente.', 'success');
            setProfileMenuView('main');
            setProfileMenuOpen(false);
        } catch (err) {
            console.error(err);
            mostrarToast('Error al actualizar el perfil.', 'error');
        }
    };

    const cambiarPassword = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            handleLogout();
            return;
        }

        if (!passwordActual || !passwordNueva || !passwordConfirmacion) {
            mostrarToast('Completa todos los campos.', 'error');
            return;
        }

        if (passwordNueva !== passwordConfirmacion) {
            mostrarToast('La confirmación no coincide con la nueva contraseña.', 'error');
            return;
        }

        if (passwordNueva.length < 4) {
            mostrarToast('La nueva contraseña debe tener al menos 4 caracteres.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/usuarios/me/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: passwordActual,
                    new_password: passwordNueva
                })
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                mostrarToast(`Error: ${body.error || 'No se pudo cambiar la contraseña'}`, 'error');
                return;
            }

            mostrarToast('Contraseña actualizada exitosamente.', 'success');
            setPasswordActual('');
            setPasswordNueva('');
            setPasswordConfirmacion('');
            setProfileMenuView('main');
            setProfileMenuOpen(false);
        } catch (err) {
            console.error(err);
            mostrarToast('Error al cambiar la contraseña.', 'error');
        }
    };

    const getNombreCargo = (cargo_id) => {
        const cargo = cargos.find(c => c.id === cargo_id);
        return cargo ? cargo.nombre_cargo : 'N/A';
    };

    // Datos para gráfico de empleados por cargo
    const empleadosPorCargoData = () => {
        const cargoCount = {};
        empleados.forEach(emp => {
            const nombreCargo = getNombreCargo(emp.cargo_id);
            cargoCount[nombreCargo] = (cargoCount[nombreCargo] || 0) + 1;
        });

        return {
            labels: Object.keys(cargoCount),
            datasets: [{
                label: 'Empleados',
                data: Object.values(cargoCount),
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(241, 196, 15, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(26, 188, 156, 0.8)',
                    'rgba(230, 126, 34, 0.8)',
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(26, 188, 156, 1)',
                    'rgba(230, 126, 34, 1)',
                ],
                borderWidth: 2
            }]
        };
    };

    // Datos para gráfico de estado de empleados
    const estadoEmpleadosData = {
        labels: ['Activos', 'Inactivos'],
        datasets: [{
            label: 'Empleados',
            data: [estadisticas.empleadosActivos, estadisticas.empleadosInactivos],
            backgroundColor: [
                'rgba(46, 204, 113, 0.8)',
                'rgba(231, 76, 60, 0.8)',
            ],
            borderColor: [
                'rgba(46, 204, 113, 1)',
                'rgba(231, 76, 60, 1)',
            ],
            borderWidth: 2
        }]
    };

    // Datos para gráfico de asistencias del mes
    const asistenciasMesData = () => {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

        const asistenciasMes = asistencias.filter(a => {
            const fecha = new Date(a.fecha);
            return fecha >= primerDia && fecha <= ultimoDia;
        });

        const diasLabels = [];
        const puntualCount = [];
        const tardeCount = [];
        const ausenteCount = [];

        // Agrupar por semana (últimas 4 semanas)
        for (let i = 3; i >= 0; i--) {
            const inicio = new Date(hoy);
            inicio.setDate(inicio.getDate() - (i * 7 + 6));
            const fin = new Date(hoy);
            fin.setDate(fin.getDate() - (i * 7));

            diasLabels.push(`Sem ${4 - i}`);

            const asistenciasSemana = asistenciasMes.filter(a => {
                const fecha = new Date(a.fecha);
                return fecha >= inicio && fecha <= fin;
            });

            puntualCount.push(asistenciasSemana.filter(a => a.estado === 'Presente').length);
            tardeCount.push(asistenciasSemana.filter(a => a.estado === 'Tarde').length);
            ausenteCount.push(asistenciasSemana.filter(a => a.estado === 'Ausente').length);
        }

        return {
            labels: diasLabels,
            datasets: [
                {
                    label: 'Puntual',
                    data: puntualCount,
                    backgroundColor: 'rgba(46, 204, 113, 0.8)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Tarde',
                    data: tardeCount,
                    backgroundColor: 'rgba(241, 196, 15, 0.8)',
                    borderColor: 'rgba(241, 196, 15, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Ausente',
                    data: ausenteCount,
                    backgroundColor: 'rgba(231, 76, 60, 0.8)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 2
                }
            ]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
    };

    if (!usuario) {
        return (
            <div className="loading-container">
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container main-with-sidebar">
            <Sidebar />

            <main className="main-content">
                <header className="dashboard-header">
                    <div className="user-info">
                        <h1>Bienvenido, {usuario.username}</h1>
                        <p className="user-role">Rol: {usuario.rol}</p>
                        <p className={`session-status session-status-${sessionStatus.variant}`}>● {sessionStatus.label}</p>
                    </div>
                    <div className="profile-menu" ref={profileMenuRef}>
                        <button
                            type="button"
                            className="btn-profile"
                            aria-haspopup="menu"
                            aria-expanded={profileMenuOpen}
                            onClick={() => {
                                setProfileMenuOpen((v) => !v);
                                setProfileMenuView('main');
                            }}
                        >
                            {usuario.username} ▾
                        </button>

                        {profileMenuOpen && (
                            <div className="profile-dropdown" role="menu">
                                {profileMenuView === 'main' && (
                                    <>
                                        <div className="profile-dropdown-header">
                                            <div className="profile-dropdown-user">
                                                <div className="profile-dropdown-name">{usuario.username}</div>
                                                <div className="profile-dropdown-role">{usuario.rol}</div>
                                            </div>
                                            <div className={`profile-session profile-session-${sessionStatus.variant}`}>
                                                ● {sessionStatus.label}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="profile-item"
                                            onClick={() => setProfileMenuView('profile')}
                                            role="menuitem"
                                        >
                                            Mi perfil
                                        </button>
                                        <button
                                            type="button"
                                            className="profile-item"
                                            onClick={() => setProfileMenuView('password')}
                                            role="menuitem"
                                        >
                                            Cambiar contraseña
                                        </button>
                                        <button
                                            type="button"
                                            className="profile-item profile-item-danger"
                                            onClick={handleLogout}
                                            role="menuitem"
                                        >
                                            Cerrar sesión
                                        </button>
                                    </>
                                )}

                                {profileMenuView === 'profile' && (
                                    <form className="profile-form" onSubmit={guardarPerfil}>
                                        <div className="profile-form-title">Mi perfil</div>
                                        <label className="profile-label">
                                            Username
                                            <input
                                                className="profile-input"
                                                value={perfilUsername}
                                                onChange={(e) => setPerfilUsername(e.target.value)}
                                            />
                                        </label>
                                        <div className="profile-actions">
                                            <button type="button" className="profile-btn" onClick={() => setProfileMenuView('main')}>
                                                Volver
                                            </button>
                                            <button type="submit" className="profile-btn profile-btn-primary">
                                                Guardar
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {profileMenuView === 'password' && (
                                    <form className="profile-form" onSubmit={cambiarPassword}>
                                        <div className="profile-form-title">Cambiar contraseña</div>
                                        <label className="profile-label">
                                            Contraseña actual
                                            <input
                                                className="profile-input"
                                                type="password"
                                                value={passwordActual}
                                                onChange={(e) => setPasswordActual(e.target.value)}
                                            />
                                        </label>
                                        <label className="profile-label">
                                            Nueva contraseña
                                            <input
                                                className="profile-input"
                                                type="password"
                                                value={passwordNueva}
                                                onChange={(e) => setPasswordNueva(e.target.value)}
                                            />
                                        </label>
                                        <label className="profile-label">
                                            Confirmar nueva contraseña
                                            <input
                                                className="profile-input"
                                                type="password"
                                                value={passwordConfirmacion}
                                                onChange={(e) => setPasswordConfirmacion(e.target.value)}
                                            />
                                        </label>
                                        <div className="profile-actions">
                                            <button type="button" className="profile-btn" onClick={() => setProfileMenuView('main')}>
                                                Volver
                                            </button>
                                            <button type="submit" className="profile-btn profile-btn-primary">
                                                Guardar
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {toast && (
                    <div className={`toast toast-${toastType}`}>
                        {toast}
                    </div>
                )}

                {cargando && (
                    <div className="loading">
                        <p>Cargando datos...</p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                    </div>
                )}

                {!cargando && !error && (
                    <>
                        {/* Tarjetas de estadísticas */}
                        <div className="stats-container">
                            <div className="stat-card stat-primary">
                                <div className="stat-icon">👥</div>
                                <div className="stat-content">
                                    <h3>Total Empleados</h3>
                                    <p className="stat-number">{estadisticas.totalEmpleados}</p>
                                </div>
                            </div>

                            {/* <div className="stat-card stat-success">
                                <div className="stat-icon">✅</div>
                                <div className="stat-content">
                                    <h3>Empleados Activos</h3>
                                    <p className="stat-number">{estadisticas.empleadosActivos}</p>
                                </div>
                            </div>

                            <div className="stat-card stat-danger">
                                <div className="stat-icon">⛔</div>
                                <div className="stat-content">
                                    <h3>Empleados Inactivos</h3>
                                    <p className="stat-number">{estadisticas.empleadosInactivos}</p>
                                </div>
                            </div> */}

                            <div className="stat-card stat-warning">
                                <div className="stat-icon">💼</div>
                                <div className="stat-content">
                                    <h3>Total Cargos</h3>
                                    <p className="stat-number">{estadisticas.totalCargos}</p>
                                </div>
                            </div>

                            <div className="stat-card stat-info">
                                <div className="stat-icon">💰</div>
                                <div className="stat-content">
                                    <h3>Promedio Sueldo</h3>
                                    <p className="stat-number">${parseFloat(estadisticas.promedioSueldo).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>

                        {/* Gráficos */}
                        <div className="charts-container">
                            <div className="chart-card">
                                <h3>Empleados por Cargo</h3>
                                <div className="chart-wrapper">
                                    <Bar data={empleadosPorCargoData()} options={chartOptions} />
                                </div>
                            </div>

                            {/* <div className="chart-card">
                                <h3>Estado de Empleados</h3>
                                <div className="chart-wrapper">
                                    <Doughnut data={estadoEmpleadosData} options={chartOptions} />
                                </div>
                            </div> */}

                            {/* <div className="chart-card chart-wide">
                                <h3>Asistencias del Mes (por Semana)</h3>
                                <div className="chart-wrapper">
                                    <Bar data={asistenciasMesData()} options={chartOptions} />
                                </div>
                            </div> */}
                        </div>

                        {/* Tabla de empleados */}
                        <section className="empleados-section">
                            <h2>Lista de Empleados</h2>
                            <div className="table-container">
                                <table className="tabla-empleados">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Cargo</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {empleados.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="no-data">
                                                    No hay empleados registrados
                                                </td>
                                            </tr>
                                        ) : (
                                            empleadosPaginaActual.map(empleado => (
                                                <tr key={empleado.id}>
                                                    <td>{empleado.id}</td>
                                                    <td>{empleado.nombres} {empleado.apellidos}</td>
                                                    <td>{getNombreCargo(empleado.cargo_id)}</td>
                                                    <td>
                                                        <span className={`badge badge-${empleado.estado.toLowerCase()}`}>
                                                            {empleado.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {empleados.length > EMPLEADOS_PAGE_SIZE && (
                                <div className="dashboard-pagination">
                                    <div className="dashboard-pagination-info">
                                        Mostrando <strong>{empleadosPageStart + 1}</strong>–<strong>{empleadosPageEndExclusive}</strong> de <strong>{empleados.length}</strong>
                                    </div>
                                    <div className="dashboard-pagination-controls">
                                        <button
                                            className="dashboard-page-nav"
                                            onClick={() => setEmpleadosPageIndex((prev) => Math.max(prev - 1, 0))}
                                            disabled={empleadosPageIndex === 0}
                                        >
                                            Anterior
                                        </button>

                                        <div className="dashboard-page-numbers">
                                            {[...Array(empleadosTotalPages)].map((_, index) => (
                                                <button
                                                    key={index}
                                                    className={`dashboard-page-number ${empleadosPageIndex === index ? 'active' : ''}`}
                                                    onClick={() => setEmpleadosPageIndex(index)}
                                                >
                                                    {index + 1}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            className="dashboard-page-nav"
                                            onClick={() => setEmpleadosPageIndex((prev) => Math.min(prev + 1, empleadosTotalPages - 1))}
                                            disabled={empleadosPageIndex >= empleadosTotalPages - 1}
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default Dashboard;