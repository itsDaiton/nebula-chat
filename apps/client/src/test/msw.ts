import { setupServer } from 'msw/node';

// Handlers are registered per-test with `server.use(...)`; an unhandled request
// fails the test (see setup.ts) rather than silently hitting the network.
export const server = setupServer();
