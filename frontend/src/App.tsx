import { RouterProvider } from './RouterProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <RouterProvider />
    </ThemeProvider>
  );
}

export default App;
