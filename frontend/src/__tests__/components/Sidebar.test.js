import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { buildFakeToken } from '../../testUtils';

describe('Sidebar Component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('renders dashboard link by default when no token', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  test('shows all modules for administrator', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'Administrador', user_id: 1 });
    localStorage.setItem('token', token);

    // En /dashboard el menú de "Gestión de Personal" se despliega por defecto
    window.history.pushState({}, '', '/dashboard');

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Usuarios/i)).toBeInTheDocument();
      expect(screen.getByText(/Empleados/i)).toBeInTheDocument();
      expect(screen.getByText(/Cargos/i)).toBeInTheDocument();
    });
  });

  test('shows limited modules for regular user based on cargo permissions', async () => {
    const token = buildFakeToken({ username: 'user1', rol: 'Analista', user_id: 2 });
    localStorage.setItem('token', token);

    // En /dashboard el menú de "Gestión de Personal" se despliega por defecto
    window.history.pushState({}, '', '/dashboard');

    const mockCargos = [
      {
        id: 1,
        nombre_cargo: 'Analista',
        permisos: JSON.stringify(['dashboard', 'empleados'])
      }
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCargos)
      })
    );

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Empleados/i)).toBeInTheDocument();
    });

    // No debe mostrar módulos sin permiso
    expect(screen.queryByText(/Usuarios/i)).not.toBeInTheDocument();
  });

  test('handles admin role case-insensitive', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'admin', user_id: 1 });
    localStorage.setItem('token', token);

    // En /dashboard el menú de "Gestión de Personal" se despliega por defecto
    window.history.pushState({}, '', '/dashboard');

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Usuarios/i)).toBeInTheDocument();
    });
  });

  test('shows only dashboard when cargo has no permissions', async () => {
    const token = buildFakeToken({ username: 'user1', rol: 'Operador', user_id: 2 });
    localStorage.setItem('token', token);

    const mockCargos = [
      {
        id: 1,
        nombre_cargo: 'Operador',
        permisos: JSON.stringify([])
      }
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCargos)
      })
    );

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Usuarios/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Empleados/i)).not.toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    const token = buildFakeToken({ username: 'user1', rol: 'Analista', user_id: 2 });
    localStorage.setItem('token', token);

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });

  test('filters out invalid permissions', async () => {
    const token = buildFakeToken({ username: 'user1', rol: 'Gerente', user_id: 2 });
    localStorage.setItem('token', token);

    // En /dashboard el menú de "Gestión de Personal" se despliega por defecto
    window.history.pushState({}, '', '/dashboard');

    const mockCargos = [
      {
        id: 1,
        nombre_cargo: 'Gerente',
        permisos: JSON.stringify(['dashboard', 'empleados', 'modulo-inexistente', 'otro-invalido'])
      }
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCargos)
      })
    );

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Empleados/i)).toBeInTheDocument();
    });

    // Módulos inválidos no deben aparecer
    expect(screen.queryByText(/modulo-inexistente/i)).not.toBeInTheDocument();
  });
});
