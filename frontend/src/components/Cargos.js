import React, { useState, useEffect } from 'react';
import './Cargos.css';

function Cargos() {
  const [cargos, setCargos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargoActual, setCargoActual] = useState({
    id: null,
    nombre_cargo: '',
    sueldo_base: ''
  });

  useEffect(() => {
    cargarCargos();
  }, []);

  const cargarCargos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/cargos/', {
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
      setCargoActual(cargo);
      setModoEdicion(true);
    } else {
      setCargoActual({
        id: null,
        nombre_cargo: '',
        sueldo_base: ''
      });
      setModoEdicion(false);
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setCargoActual({
      id: null,
      nombre_cargo: '',
      sueldo_base: ''
    });
  };

  const guardarCargo = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const url = modoEdicion 
        ? `http://localhost:5000/api/cargos/${cargoActual.id}`
        : 'http://localhost:5000/api/cargos/';
      
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
        const response = await fetch(`http://localhost:5000/api/cargos/${id}`, {
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

export default Cargos;
