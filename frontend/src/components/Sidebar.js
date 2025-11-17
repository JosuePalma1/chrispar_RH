import React from 'react';
import './Sidebar.css';

function Sidebar() {
    return (
        <aside className="sidebar">
            <h2>Módulos</h2>
            <nav>
                <ul>
                    <li>
                        <a href="/empleados">Empleados</a>
                    </li>
                    <li>
                        <a href="/hojas-vida">Hojas de Vida</a>
                    </li>
                    <li>
                        <a href="/asistencias">Asistencias</a>
                    </li>
                    <li>
                        <a href="/horarios">Horarios</a>
                    </li>
                    <li>
                        <a href="/permisos">Permisos / Vacaciones</a>
                    </li>
                    <li>
                        <a href="/nomina">Nómina</a>
                    </li>
                    <li>
                        <a href="/rubros">Rubros de pago</a>
                    </li>
                    <li>
                        <a href="/cargos">Cargos</a>
                    </li>
                    <li>
                        <a href="/usuarios">Usuarios</a>
                    </li>
                    <li>
                        <a href="/logs">Auditoría / Logs</a>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}

export default Sidebar;