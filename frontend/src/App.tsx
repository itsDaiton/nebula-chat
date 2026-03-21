import { CodeBlock } from '@chakra-ui/react';
import { RouterProvider } from '@/routing/RouterProvider';
import { ThemeProvider } from '@/theme/providers/ThemeProvider';
import { ConversationsProvider } from '@/modules/conversations/providers/ConversationsProvider';
import { Toaster } from '@/shared/components/ui/toaster';
import { shikiAdapter } from '@/shared/components/ui/code-block-adapter';
import '@/App.css';

const App = () => (
  <ThemeProvider>
    <CodeBlock.AdapterProvider value={shikiAdapter}>
      <ConversationsProvider>
        <RouterProvider />
        <Toaster />
      </ConversationsProvider>
    </CodeBlock.AdapterProvider>
  </ThemeProvider>
);

export default App;
