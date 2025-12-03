/**
 * Utility functions for tests
 */

// Build a fake JWT token for testing (without using Buffer which doesn't work in browser)
export const buildFakeToken = ({ username, rol, user_id }) => {
  const payload = btoa(JSON.stringify({ username, rol, user_id }));
  return ['header', payload, 'signature'].join('.');
};

export const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    return null;
  }
};

export const mockFetchSuccess = (data) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
};

export const mockFetchError = (status = 500, errorData = {}) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(errorData),
  });
};

export const setupAuthHeaders = (token) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};
