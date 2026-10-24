import { CodeBlock } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet, useRouteContext } from '@tanstack/react-router';
import { RouterDevtools } from '@/routing/RouterDevtools';
import { shikiAdapter } from '@/shared/components/ui/code-block-adapter';
import { Toaster } from '@/shared/components/ui/toaster';
import { ThemeProvider } from '@/theme/providers/ThemeProvider';

/** The root route: the app's providers around every page. */
export const RootLayout = () => {
  const { queryClient } = useRouteContext({ from: '__root__' });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CodeBlock.AdapterProvider value={shikiAdapter}>
          <Outlet />
          <Toaster />
        </CodeBlock.AdapterProvider>
      </ThemeProvider>
      <RouterDevtools />
    </QueryClientProvider>
  );
};
