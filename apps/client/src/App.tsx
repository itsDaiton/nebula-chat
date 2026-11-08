import { RouterProvider } from '@tanstack/react-router';
import { getGetModelCatalogQueryOptions } from '@/libs/api/generated/models/models';
import { queryClient } from '@/libs/api/queryClient';
import { MODEL_CATALOG_STALE_TIME } from '@/modules/chat/hooks/useModelCatalog';
import { createAppRouter } from '@/routing/router';
import '@/App.css';
import '@/styles/globals.css';

const router = createAppRouter({ queryClient });

// Starts the catalog request while the session guard resolves, without holding any route back.
void queryClient.prefetchQuery({
  ...getGetModelCatalogQueryOptions(),
  staleTime: MODEL_CATALOG_STALE_TIME,
});

const App = () => <RouterProvider router={router} />;

export default App;
