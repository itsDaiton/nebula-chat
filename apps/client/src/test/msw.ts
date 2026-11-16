import { setupServer } from 'msw/node';
import { getGetModelCatalogMockHandler } from '@/libs/api/generated/models/models.msw';
import { testCatalog } from '@/test/models';

// Handlers are registered per-test with `server.use(...)`; an unhandled request
// fails the test (see setup.ts) rather than silently hitting the network.
// The catalog is the one default: the root route prefetches it on every page.
export const server = setupServer(getGetModelCatalogMockHandler(testCatalog));
