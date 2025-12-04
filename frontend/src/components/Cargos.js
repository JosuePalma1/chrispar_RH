import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Cargos.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Cargos() {
  const [cargos, setCargos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ordenamiento, setOrdenamiento] = useState({ campo: null, direccion: 'asc' });
  const [rolUsuario, setRolUsuario] = useState('');
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
    { id: 'horarios', nombre: 'Horarios' },
    { id: 'asistencias', nombre: 'Asistencias' },
    { id: 'permisos', nombre: 'Permisos/Vacaciones' },
    { id: 'nomina', nombre: 'Nómina' },
    { id: 'rubros', nombre: 'Rubros de Pago' },
    { id: 'logs', nombre: 'Logs de Auditoría' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRolUsuario(payload.rol || '');
      } catch (e) {
        console.error('Error al decodificar token:', e);
      }
    }
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
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar cargos');
        return;
      }
      
      const data = await response.json();
      setCargos(data);
      setError('');
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión al cargar cargos');
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

  const seleccionarTodos = () => {
    const todosLosModulos = modulosDisponibles.map(m => m.id);
    setCargoActual({
      ...cargoActual,
      permisos: todosLosModulos
    });
  };

  const deseleccionarTodos = () => {
    setCargoActual({
      ...cargoActual,
      permisos: ['dashboard'] // Solo mantener dashboard
    });
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
        alert(`Cargo ${modoEdicion ? 'actualizado' : 'creado'} exitosamente`);
        cargarCargos();
        cerrarModal();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo guardar el cargo'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión al guardar el cargo');
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

  const ordenarPor = (campo) => {
    const direccion = ordenamiento.campo === campo && ordenamiento.direccion === 'asc' ? 'desc' : 'asc';
    setOrdenamiento({ campo, direccion });
  };

  const obtenerCargosFiltradosYOrdenados = () => {
    let resultado = cargos.filter(cargo => 
      cargo.nombre_cargo.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (ordenamiento.campo) {
      resultado.sort((a, b) => {
        let valorA = a[ordenamiento.campo];
        let valorB = b[ordenamiento.campo];

        if (ordenamiento.campo === 'sueldo_base') {
          valorA = parseFloat(valorA);
          valorB = parseFloat(valorB);
        } else if (typeof valorA === 'string') {
          valorA = valorA.toLowerCase();
          valorB = valorB.toLowerCase();
        }

        if (valorA < valorB) return ordenamiento.direccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenamiento.direccion === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="cargos-container">
        <div className="cargos-header">
          <h2>Gestión de Cargos</h2>
          {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') && (
            <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Cargo</button>
          )}
        </div>

        {error && <div className="error-banner" style={{padding: '10px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '15px', borderRadius: '4px'}}>{error}</div>}

        <div style={{marginBottom: '15px'}}>
          <input
            type="text"
            placeholder="Buscar por nombre del cargo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{padding: '8px 12px', width: '300px', borderRadius: '4px', border: '1px solid #ddd'}}
          />
        </div>

        <table className="cargos-tabla">
        <thead>
          <tr>
            <th onClick={() => ordenarPor('nombre_cargo')} style={{cursor: 'pointer'}}>
              Nombre {ordenamiento.campo === 'nombre_cargo' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => ordenarPor('sueldo_base')} style={{cursor: 'pointer'}}>
              Salario Base {ordenamiento.campo === 'sueldo_base' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {obtenerCargosFiltradosYOrdenados().map(cargo => (
            <tr key={cargo.id}>
              <td>{cargo.nombre_cargo}</td>
              <td>{cargo.sueldo_base}</td>
              <td>
                {(rolUsuario === 'admin' || rolUsuario === 'Administrador') ? (
                  <>
                    <button className="btn-editar" onClick={() => abrirModal(cargo)}>Editar</button>
                    <button className="btn-eliminar" onClick={() => eliminarCargo(cargo.id)}>Eliminar</button>
                  </>
                ) : (rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
                  <>
                    <button className="btn-editar" onClick={() => abrirModal(cargo)}>Editar</button>
                  </>
                ) : (
                  <span style={{color: '#999', fontSize: '14px'}}>Solo lectura</span>
                )}
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
                  minLength="3"
                  maxLength="50"
                  required
                  title="El nombre debe tener entre 3 y 50 caracteres"
                />
              </div>
              <div className="form-grupo">
                <label>Sueldo Base:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cargoActual.sueldo_base}
                  onChange={(e) => setCargoActual({...cargoActual, sueldo_base: e.target.value})}
                  min="0.01"
                  required
                  title="El sueldo debe ser mayor a 0"
                />
              </div>
              
              <div className="form-grupo">
                <label>Módulos Permitidos:</label>
                <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                  <button type="button" onClick={seleccionarTodos} style={{padding: '5px 15px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px'}}>Seleccionar Todos</button>
                  <button type="button" onClick={deseleccionarTodos} style={{padding: '5px 15px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px'}}>Deseleccionar Todos</button>
                </div>
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
