import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { wakeWorker } from '@/shared/utils/wakeWorker';

wakeWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
