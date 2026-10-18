import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderHookResult,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { createQueryClient } from '@/libs/api/queryClient';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** Initial history entries for components that read the route. */
  route?: string;
  /** The query client to render against; a fresh one (retry off) by default. */
  queryClient?: QueryClient;
};

/** A fresh query client per test, so no cached response leaks between tests. */
export const createTestQueryClient = () => createQueryClient({ retry: false });

/**
 * Renders with the Chakra system, a fresh query client and a memory router in place.
 *
 * Uses `defaultSystem` rather than the app's own Provider: the theme tokens are
 * excluded from coverage as declarations, and ColorModeProvider pulls in
 * next-themes, whose storage access is noise in a component test.
 */
export const renderWithChakra = (ui: ReactElement, options: Options = {}): RenderResult => {
  const { route = '/', queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ChakraProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/** `renderHook` inside a query client, for hooks that read server state. */
export const renderHookWithQueryClient = <Result, Props>(
  hook: (props: Props) => Result,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: Omit<RenderHookOptions<Props>, 'wrapper'> & { queryClient?: QueryClient } = {},
): RenderHookResult<Result, Props> & { queryClient: QueryClient } => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...renderHook(hook, { wrapper: Wrapper, ...options }), queryClient };
};
