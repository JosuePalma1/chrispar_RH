import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './Sidebar.css';
import { 
    FaHome, FaUsers, FaUserTie, FaIdCard, FaCalendarAlt, 
    FaClock, FaMoneyBillWave, FaFileInvoiceDollar, 
    FaClipboardList, FaHistory, FaChevronDown, FaChevronRight, FaDatabase 
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const AVAILABLE_MODULES = ['dashboard', 'cargos', 'usuarios', 'empleados', 'hojas-vida', 'horarios', 'nomina', 'rubros', 'logs', 'permisos', 'asistencias', 'mirror'];
const SIDEBAR_MENU_STATE_KEY = 'sidebar.menuAbierto';

function Sidebar() {
    const location = useLocation();
    const isDashboardRoute = location.pathname === '/dashboard';

    const [permisos, setPermisos] = useState(['dashboard']);

    useEffect(() => {
        const cargarPermisos = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setPermisos(['dashboard']);
                return;
            }

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const nombreCargo = payload.rol;

                if (nombreCargo.toLowerCase() === 'administrador' || nombreCargo.toLowerCase() === 'admin') {
                    setPermisos(AVAILABLE_MODULES);
                    return;
                }

                const response = await fetch(`${API_URL}/api/cargos/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const cargos = await response.json();
                    const cargoUsuario = cargos.find(c => c.nombre_cargo === nombreCargo);
                    
                    if (cargoUsuario && cargoUsuario.permisos) {
                        const permisosCargo = Array.isArray(cargoUsuario.permisos)
                            ? cargoUsuario.permisos
                            : JSON.parse(cargoUsuario.permisos || '[]');
                        const permisosValidos = permisosCargo.filter((permiso) => AVAILABLE_MODULES.includes(permiso));
                        setPermisos(permisosValidos.length ? permisosValidos : ['dashboard']);
                    } else {
                        setPermisos(['dashboard']);
                    }
                } else {
                    setPermisos(['dashboard']);
                }
            } catch (error) {
                setPermisos(['dashboard']);
            }
        };

        cargarPermisos();
    }, []);

    const [menuAbiertoUser, setMenuAbiertoUser] = useState(() => {
        const defaults = {
            personal: false,
            tiempo: false,
            financiero: false,
            sistema: false,
        };

        try {
            const raw = localStorage.getItem(SIDEBAR_MENU_STATE_KEY);
            if (!raw) return defaults;
            const parsed = JSON.parse(raw);
            return {
                ...defaults,
                ...Object.fromEntries(
                    Object.entries(parsed || {}).filter(([key]) => key in defaults)
                ),
            };
        } catch {
            return defaults;
        }
    });

    // Estado efectivo: "personal" se mantiene abierto en dashboard.
    const menuAbierto = useMemo(() => {
        return {
            ...menuAbiertoUser,
            personal: isDashboardRoute ? true : menuAbiertoUser.personal,
        };
    }, [menuAbiertoUser, isDashboardRoute]);

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_MENU_STATE_KEY, JSON.stringify(menuAbiertoUser));
        } catch {
            // Ignorar errores (p.ej. storage lleno o bloqueado)
        }
    }, [menuAbiertoUser]);

    const toggleMenu = (categoria) => {
        // En dashboard, "Gestión de Personal" se muestra siempre desplegado.
        if (categoria === 'personal' && isDashboardRoute) return;

        setMenuAbiertoUser(prev => ({
            ...prev,
            [categoria]: !prev[categoria]
        }));
    };

    const menuEstructura = [
        {
            categoria: 'dashboard',
            icono: <FaHome />,
            nombre: 'Dashboard',
            ruta: '/dashboard',
            simple: true
        },
        {
            categoria: 'personal',
            icono: <FaUsers />,
            nombre: 'Gestión de Personal',
            submodulos: [
                { id: 'cargos', nombre: 'Cargos', ruta: '/cargos', icono: <FaIdCard /> },
                { id: 'usuarios', nombre: 'Usuarios', ruta: '/usuarios', icono: <FaUserTie /> },
                { id: 'empleados', nombre: 'Empleados', ruta: '/empleados', icono: <FaUsers /> },
                { id: 'hojas-vida', nombre: 'Hojas de Vida', ruta: '/hojas-vida', icono: <FaClipboardList /> }
            ]
        },
        {
            categoria: 'tiempo',
            icono: <FaClock />,
            nombre: 'Control de Tiempo',
            submodulos: [
                { id: 'horarios', nombre: 'Horarios', ruta: '/horarios', icono: <FaCalendarAlt /> },
                { id: 'asistencias', nombre: 'Asistencias', ruta: '/asistencias', icono: <FaClock /> },
                { id: 'permisos', nombre: 'Permisos/Vacaciones', ruta: '/permisos', icono: <FaClipboardList /> }
            ]
        },
        {
            categoria: 'financiero',
            icono: <FaMoneyBillWave />,
            nombre: 'Gestión Financiera',
            submodulos: [
                { id: 'nomina', nombre: 'Nómina', ruta: '/nomina', icono: <FaMoneyBillWave /> },
                { id: 'rubros', nombre: 'Rubros de Pago', ruta: '/rubros', icono: <FaFileInvoiceDollar /> }
            ]
        },
        {
            categoria: 'sistema',
            icono: <FaHistory />,
            nombre: 'Sistema',
            submodulos: [
                { id: 'logs', nombre: 'Auditoría / Logs', ruta: '/logs', icono: <FaHistory /> },
                { id: 'mirror', nombre: 'BD Espejo', ruta: '/mirror', icono: <FaDatabase /> }
            ]
        }
    ];

    const tienePermisoCategoria = (submodulos) => {
        return submodulos.some(sub => permisos.includes(sub.id));
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>CHRISPAR HHRR</h2>
            </div>
            <nav className="sidebar-nav">
                {menuEstructura.map((item) => {
                    if (item.simple && permisos.includes(item.categoria)) {
                        return (
                            <a key={item.categoria} href={item.ruta} className="menu-item-simple">
                                <span className="menu-icon">{item.icono}</span>
                                <span className="menu-text">{item.nombre}</span>
                            </a>
                        );
                    }

                    if (!item.simple && tienePermisoCategoria(item.submodulos)) {
                        return (
                            <div key={item.categoria} className="menu-categoria">
                                <div 
                                    className="menu-categoria-header" 
                                    onClick={() => toggleMenu(item.categoria)}
                                >
                                    <div className="menu-categoria-titulo">
                                        <span className="menu-icon">{item.icono}</span>
                                        <span className="menu-text">{item.nombre}</span>
                                    </div>
                                    <span className="menu-chevron">
                                        {menuAbierto[item.categoria] ? <FaChevronDown /> : <FaChevronRight />}
                                    </span>
                                </div>
                                {menuAbierto[item.categoria] && (
                                    <div className="menu-submodulos">
                                        {item.submodulos.map((sub) => (
                                            permisos.includes(sub.id) && (
                                                <a key={sub.id} href={sub.ruta} className="menu-subitem">
                                                    <span className="submenu-icon">{sub.icono}</span>
                                                    <span className="submenu-text">{sub.nombre}</span>
                                                </a>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return null;
                })}
            </nav>
        </aside>
    );
}

export default Sidebar;