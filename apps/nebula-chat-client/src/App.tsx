import { CodeBlock } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/libs/api/queryClient';
import { RouterProvider } from '@/routing/RouterProvider';
import { ThemeProvider } from '@/theme/providers/ThemeProvider';
import { Toaster } from '@/shared/components/ui/toaster';
import { shikiAdapter } from '@/shared/components/ui/code-block-adapter';
import '@/App.css';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CodeBlock.AdapterProvider value={shikiAdapter}>
        <RouterProvider />
        <Toaster />
      </CodeBlock.AdapterProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
