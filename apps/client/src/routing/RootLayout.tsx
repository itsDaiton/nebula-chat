import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet, useRouteContext } from '@tanstack/react-router';
import { RouterDevtools } from '@/routing/RouterDevtools';
import { Toaster as SonnerToaster } from '@/shared/components/ui/sonner';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ThemeProvider } from '@/shared/components/ThemeProvider';

/** The root route: the app's providers around every page. */
export const RootLayout = () => {
  const { queryClient } = useRouteContext({ from: '__root__' });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Outlet />
          <SonnerToaster />
        </TooltipProvider>
      </ThemeProvider>
      <RouterDevtools />
    </QueryClientProvider>
  );
};
