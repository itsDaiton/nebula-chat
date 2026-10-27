import { CodeBlock } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet, useRouteContext } from '@tanstack/react-router';
import { RouterDevtools } from '@/routing/RouterDevtools';
import { shikiAdapter } from '@/shared/components/ui/code-block-adapter';
import { Toaster as SonnerToaster } from '@/shared/components/ui/sonner';
import { Toaster } from '@/shared/components/ui/toaster';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ThemeProvider } from '@/theme/providers/ThemeProvider';

/** The root route: the app's providers around every page. */
export const RootLayout = () => {
  const { queryClient } = useRouteContext({ from: '__root__' });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <CodeBlock.AdapterProvider value={shikiAdapter}>
            <Outlet />
            <Toaster />
            <SonnerToaster />
          </CodeBlock.AdapterProvider>
        </TooltipProvider>
      </ThemeProvider>
      <RouterDevtools />
    </QueryClientProvider>
  );
};
