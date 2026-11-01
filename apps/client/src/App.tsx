import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '@/libs/api/queryClient';
import { createAppRouter } from '@/routing/router';
import '@/App.css';
import '@/styles/globals.css';

const router = createAppRouter({ queryClient });

const App = () => <RouterProvider router={router} />;

export default App;
