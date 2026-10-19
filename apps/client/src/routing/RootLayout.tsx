import { CodeBlock } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet, useRouteContext } from '@tanstack/react-router';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { LegacyRouter } from '@/routing/LegacyRouter';
import { RouterDevtools } from '@/routing/RouterDevtools';
import { shikiAdapter } from '@/shared/components/ui/code-block-adapter';
import { Toaster } from '@/shared/components/ui/toaster';
import { ThemeProvider } from '@/theme/providers/ThemeProvider';

/** The root route: the app's providers around every page, and AuthGate before any of them. */
export const RootLayout = () => {
  const { queryClient } = useRouteContext({ from: '__root__' });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CodeBlock.AdapterProvider value={shikiAdapter}>
          {/* Settings' header still uses react-router, so the bridge's router wraps every route. */}
          <LegacyRouter>
            <AuthGate>
              <Outlet />
            </AuthGate>
          </LegacyRouter>
          <Toaster />
        </CodeBlock.AdapterProvider>
      </ThemeProvider>
      <RouterDevtools />
    </QueryClientProvider>
  );
};
