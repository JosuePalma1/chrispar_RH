import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Horario from './components/Horario';
import HojaDeVida from './components/HojaDeVida';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/horarios" element={<Horario />} />
          <Route path="/hojas-vida" element={<HojaDeVida />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
