import { RouterProvider } from '@/routing/RouterProvider';
import { ThemeProvider } from '@/theme/providers/ThemeProvider';
import { ConversationsProvider } from '@/modules/conversations/providers/ConversationsProvider';
import { Toaster } from '@/shared/components/ui/toaster';
import '@/App.css';

const App = () => (
  <ThemeProvider>
    <ConversationsProvider>
      <RouterProvider />
      <Toaster />
    </ConversationsProvider>
  </ThemeProvider>
);

export default App;
