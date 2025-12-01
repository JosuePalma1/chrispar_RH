import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Cargos from './components/Cargos';
import Empleados from './components/Empleados';
import Usuarios from './components/Usuarios';
import HojaDeVida from './components/HojaDeVida';
import Horario from './components/Horario';
import Nominas from './components/Nominas';
import Rubros from './components/Rubros';
import Logs from './components/Logs';
import Permisos from './components/Permisos';
import Asistencias from './components/Asistencias';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cargos" element={<ProtectedRoute><Cargos /></ProtectedRoute>} />
          <Route path="/empleados" element={<ProtectedRoute><Empleados /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/hojas-vida" element={<ProtectedRoute><HojaDeVida /></ProtectedRoute>} />
          <Route path="/horarios" element={<ProtectedRoute><Horario /></ProtectedRoute>} />
          <Route path="/nomina" element={<ProtectedRoute><Nominas /></ProtectedRoute>} />
          <Route path="/rubros" element={<ProtectedRoute><Rubros /></ProtectedRoute>} />
          <Route path="/permisos" element={<ProtectedRoute><Permisos /></ProtectedRoute>} />
          <Route path="/asistencias" element={<ProtectedRoute><Asistencias /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;