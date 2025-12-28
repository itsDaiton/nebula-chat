import { RouterProvider } from './RouterProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConversationsProvider } from './modules/conversations/context/ConversationsContext';
import { Toaster } from './shared/components/ui/toaster';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ConversationsProvider>
        <RouterProvider />
        <Toaster />
      </ConversationsProvider>
    </ThemeProvider>
  );
}

export default App;
