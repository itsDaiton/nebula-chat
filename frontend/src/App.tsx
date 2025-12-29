import { RouterProvider } from './RouterProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConversationsProvider } from './modules/conversations/context/ConversationsContext';
import { SearchStateProvider } from './shared/context/SearchStateContext';
import { Toaster } from './shared/components/ui/toaster';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <SearchStateProvider>
        <ConversationsProvider>
          <RouterProvider />
          <Toaster />
        </ConversationsProvider>
      </SearchStateProvider>
    </ThemeProvider>
  );
}

export default App;
