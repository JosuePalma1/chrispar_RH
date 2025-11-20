import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './components/Dashboard';

const buildFakeToken = ({ username, rol, user_id }) => {
  const payload = Buffer.from(JSON.stringify({ username, rol, user_id })).toString('base64');
  return ['header', payload, 'signature'].join('.');
};

describe('Dashboard smoke test', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    const token = buildFakeToken({ username: 'Admin', rol: 'administrador', user_id: 1 });
    localStorage.setItem('token', token);
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/empleados/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, nombres: 'Ana', apellidos: 'López', cargo_id: 2, estado: 'activo' }
          ])
        });
      }

      if (url.includes('/api/cargos/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 2, nombre_cargo: 'Analista QA' }
          ])
        });
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('renders dashboard greeting and table data', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Bienvenido, Admin/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Analista QA')).toBeInTheDocument());
    expect(screen.getByText(/Sesión activa/i)).toBeInTheDocument();
  });
});
