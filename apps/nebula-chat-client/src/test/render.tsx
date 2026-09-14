import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** Initial history entries for components that read the route. */
  route?: string;
};

/**
 * Renders with the Chakra system and a memory router in place.
 *
 * Uses `defaultSystem` rather than the app's own Provider: the theme tokens are
 * excluded from coverage as declarations, and ColorModeProvider pulls in
 * next-themes, whose storage access is noise in a component test.
 */
export const renderWithChakra = (ui: ReactElement, options: Options = {}): RenderResult => {
  const { route = '/', ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </ChakraProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
