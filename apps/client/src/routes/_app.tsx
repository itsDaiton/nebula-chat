import { createFileRoute } from '@tanstack/react-router';
import { getGetModelCatalogQueryOptions } from '@/libs/api/generated/models/models';
import { MODEL_CATALOG_STALE_TIME } from '@/modules/chat/hooks/useModelCatalog';
import { SessionError } from '@/modules/auth/components/SessionError';
import { SessionOutlet } from '@/modules/auth/components/SessionOutlet';
import { SessionPending } from '@/modules/auth/components/SessionPending';
import { sessionBootstrapOptions } from '@/modules/auth/utils/sessionBootstrap';

// The session guard: every API route 401s without a session, so no page or loader runs until one
// exists (a Guest is minted when there is none). Pathless, so it adds no segment to any URL.
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    // Starts the catalog request while the session resolves; the picker shows its own loading and error states.
    void context.queryClient.prefetchQuery({
      ...getGetModelCatalogQueryOptions(),
      staleTime: MODEL_CATALOG_STALE_TIME,
    });
    return context.queryClient.ensureQueryData(sessionBootstrapOptions);
  },
  // Show the spinner at once, as the old gate did, rather than after TanStack's default 1s.
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: SessionPending,
  errorComponent: SessionError,
  component: SessionOutlet,
});
