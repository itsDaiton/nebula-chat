import { afterAll, afterEach } from 'vitest';
import { server } from '@cli/test/msw';

// The API is mocked at the network layer, so the Orval-generated client stays under test.
server.listen({ onUnhandledFrame: 'error' });

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
