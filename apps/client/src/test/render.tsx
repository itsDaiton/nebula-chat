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
import { createQueryClient } from '@/libs/api/queryClient';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** The query client to render against; a fresh one (retry off) by default. */
  queryClient?: QueryClient;
};

/** A fresh query client per test, so no cached response leaks between tests. */
export const createTestQueryClient = () => createQueryClient({ retry: false });

/**
 * Renders with Chakra's `defaultSystem`, and a fresh query client; the app's Provider pulls in next-themes, whose storage access is noise in component tests.
 */
export const renderWithChakra = (ui: ReactElement, options: Options = {}): RenderResult => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
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
