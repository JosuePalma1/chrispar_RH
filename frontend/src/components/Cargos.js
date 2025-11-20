import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Cargos.css';

const API_URL = process.env.REACT_APP_API_URL;

function Cargos() {
  const [cargos, setCargos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargoActual, setCargoActual] = useState({
    id: null,
    nombre_cargo: '',
    sueldo_base: '',
    permisos: []
  });

  const modulosDisponibles = [
    { id: 'dashboard', nombre: 'Dashboard' },
    { id: 'cargos', nombre: 'Cargos' },
    { id: 'usuarios', nombre: 'Usuarios' },
    { id: 'empleados', nombre: 'Empleados' },
    { id: 'hojas-vida', nombre: 'Hojas de Vida' },
    { id: 'asistencias', nombre: 'Asistencias' },
    { id: 'horarios', nombre: 'Horarios' },
    { id: 'permisos', nombre: 'Permisos/Vacaciones' },
    { id: 'nomina', nombre: 'Nómina' },
    { id: 'rubros', nombre: 'Rubros de Pago' },
    { id: 'logs', nombre: 'Auditoría/Logs' }
  ];

  useEffect(() => {
    cargarCargos();
  }, []);

  const cargarCargos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cargos/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCargos(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const abrirModal = (cargo = null) => {
    if (cargo) {
      setCargoActual({
        ...cargo,
        permisos: cargo.permisos || []
      });
      setModoEdicion(true);
    } else {
      setCargoActual({
        id: null,
        nombre_cargo: '',
        sueldo_base: '',
        permisos: ['dashboard'] // Dashboard por defecto
      });
      setModoEdicion(false);
    }
    setMostrarModal(true);
  };

  const togglePermiso = (moduloId) => {
    const permisosActuales = [...cargoActual.permisos];
    if (permisosActuales.includes(moduloId)) {
      // Si ya tiene el permiso, quitarlo (excepto dashboard que es obligatorio)
      if (moduloId !== 'dashboard') {
        setCargoActual({
          ...cargoActual,
          permisos: permisosActuales.filter(p => p !== moduloId)
        });
      }
    } else {
      // Si no tiene el permiso, agregarlo
      setCargoActual({
        ...cargoActual,
        permisos: [...permisosActuales, moduloId]
      });
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setCargoActual({
      id: null,
      nombre_cargo: '',
      sueldo_base: '',
      permisos: []
    });
  };

  const guardarCargo = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    console.log('Guardando cargo con permisos:', cargoActual.permisos);
    
    try {
      const url = modoEdicion 
        ? `${API_URL}/api/cargos/${cargoActual.id}`
        : `${API_URL}/api/cargos/`;
      
      const method = modoEdicion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cargoActual)
      });

      if (response.ok) {
        cargarCargos();
        cerrarModal();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const eliminarCargo = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cargo?')) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/cargos/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          alert('Cargo eliminado exitosamente');
          cargarCargos();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error || 'No se pudo eliminar el cargo'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el cargo');
      }
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="cargos-container">
        <div className="cargos-header">
          <h2>Gestión de Cargos</h2>
          <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Cargo</button>
        </div>

        <table className="cargos-tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Salario Base</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cargos.map(cargo => (
            <tr key={cargo.id}>
              <td>{cargo.nombre_cargo}</td>
              <td>${cargo.sueldo_base}</td>
              <td>
                <button className="btn-editar" onClick={() => abrirModal(cargo)}>Editar</button>
                <button className="btn-eliminar" onClick={() => eliminarCargo(cargo.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarModal && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>{modoEdicion ? 'Editar Cargo' : 'Nuevo Cargo'}</h3>
            <form onSubmit={guardarCargo}>
              <div className="form-grupo">
                <label>Nombre del Cargo:</label>
                <input
                  type="text"
                  value={cargoActual.nombre_cargo}
                  onChange={(e) => setCargoActual({...cargoActual, nombre_cargo: e.target.value})}
                  required
                />
              </div>
              <div className="form-grupo">
                <label>Sueldo Base:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cargoActual.sueldo_base}
                  onChange={(e) => setCargoActual({...cargoActual, sueldo_base: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-grupo">
                <label>Módulos Permitidos:</label>
                <div className="permisos-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  marginTop: '10px',
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {modulosDisponibles.map(modulo => (
                    <label key={modulo.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: modulo.id === 'dashboard' ? 'not-allowed' : 'pointer',
                      opacity: modulo.id === 'dashboard' ? 0.6 : 1
                    }}>
                      <input
                        type="checkbox"
                        checked={cargoActual.permisos.includes(modulo.id)}
                        onChange={() => togglePermiso(modulo.id)}
                        disabled={modulo.id === 'dashboard'}
                        style={{ cursor: modulo.id === 'dashboard' ? 'not-allowed' : 'pointer' }}
                      />
                      <span>{modulo.nombre}</span>
                      {modulo.id === 'dashboard' && <span style={{fontSize: '11px', color: '#666'}}>(obligatorio)</span>}
                    </label>
                  ))}
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
    </div>
  );
}

export default Cargos;
