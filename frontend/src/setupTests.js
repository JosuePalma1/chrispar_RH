// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CRA (react-scripts) does NOT read frontend/jest.config.js.
// Load canvas mocks here so chart-related components don't crash under JSDOM.
import 'jest-canvas-mock';

// Avoid crashes when tests set an invalid/empty token.
global.atob = (b64) => {
	if (typeof b64 !== 'string') return '';
	return Buffer.from(b64, 'base64').toString('binary');
};

// Dashboard renders charts, but unit tests don't need Chart.js to run.
jest.mock('react-chartjs-2', () => ({
	Bar: () => null,
	Doughnut: () => null
}));

