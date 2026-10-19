import { setupServer } from 'msw/node';

// Handlers are registered per test with `server.use(...)`; an unhandled request fails it.
export const server = setupServer();
