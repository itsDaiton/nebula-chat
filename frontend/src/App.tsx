import { RouterProvider } from './RouterProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConversationsProvider } from './modules/conversations/context/ConversationsContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ConversationsProvider>
        <RouterProvider />
      </ConversationsProvider>
    </ThemeProvider>
  );
}

export default App;
