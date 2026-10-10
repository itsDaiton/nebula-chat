import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { cleanStores } from 'nanostores';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '@/test/msw';

// ADR-0008: the API is mocked at the network layer so the Orval-generated client
// stays under test instead of being replaced by a stub.
// Listens at load, not in beforeAll, so `fetch` is patched before better-auth captures it.
server.listen({ onUnhandledRequest: 'error' });

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(async () => {
  server.close();
  // better-auth's atoms unmount a second late and touch `window`; run it before jsdom goes.
  // Imported here, not at the top, so better-auth captures `fetch` only after msw patches it.
  const { authClient } = await import('@/libs/auth/client');
  cleanStores(...Object.values(authClient.$store.atoms));
});

// jsdom implements neither of these, and Chakra UI reaches for both during layout.
beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  // Both observers must be real constructors: an open menu's positioner constructs a
  // ResizeObserver, and the infinite-scroll sentinel an IntersectionObserver, on mount.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    },
  );

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
