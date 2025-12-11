import React, { useState, useEffect } from 'react';
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';

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
    const [empleados, setEmpleados] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [nominas, setNominas] = useState([]);
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
        } catch (error) {
            console.error('Error al decodificar token:', error);
            localStorage.removeItem('token');
            navigate('/');
            return;
        }

        cargarDatos(token);
    }, [navigate]);

    const cargarDatos = async (token) => {
        await Promise.all([
            cargarEmpleados(token),
            cargarCargos(token),
            cargarAsistencias(token),
            cargarNominas(token)
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

    const cargarNominas = async (token) => {
        try {
            const respuesta = await fetch(`${API_URL}/api/nominas/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (respuesta.ok) {
                const data = await respuesta.json();
                setNominas(data);
            }
        } catch (err) {
            console.error('Error al cargar nóminas:', err);
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
            promedioSueldo: empleadosData.length > 0 ? (totalSueldo / empleadosData.length).toFixed(2) : 0
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
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
        <div className="dashboard-container">
            <Sidebar />

            <main className="main-content">
                <header className="dashboard-header">
                    <div className="user-info">
                        <h1>Bienvenido, {usuario.username}</h1>
                        <p className="user-role">Rol: {usuario.rol}</p>
                        <p className="session-status">✅ Sesión activa</p>
                    </div>
                    <button onClick={handleLogout} className="btn-logout">
                        Cerrar Sesión
                    </button>
                </header>

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

                            <div className="stat-card stat-success">
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
                            </div>

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
                                    <h3>Sueldo Promedio</h3>
                                    <p className="stat-number">${estadisticas.promedioSueldo}</p>
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

                            <div className="chart-card">
                                <h3>Estado de Empleados</h3>
                                <div className="chart-wrapper">
                                    <Doughnut data={estadoEmpleadosData} options={chartOptions} />
                                </div>
                            </div>

                            <div className="chart-card chart-wide">
                                <h3>Asistencias del Mes (por Semana)</h3>
                                <div className="chart-wrapper">
                                    <Bar data={asistenciasMesData()} options={chartOptions} />
                                </div>
                            </div>
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
                                            empleados.map(empleado => (
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
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default Dashboard;