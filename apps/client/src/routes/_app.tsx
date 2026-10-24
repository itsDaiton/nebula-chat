import { createFileRoute } from '@tanstack/react-router';
import { SessionError } from '@/modules/auth/components/SessionError';
import { SessionOutlet } from '@/modules/auth/components/SessionOutlet';
import { SessionPending } from '@/modules/auth/components/SessionPending';
import { sessionBootstrapOptions } from '@/modules/auth/utils/sessionBootstrap';

// The session guard: every API route 401s without a session, so no page or loader runs until one
// exists (a Guest is minted when there is none). Pathless, so it adds no segment to any URL.
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => context.queryClient.ensureQueryData(sessionBootstrapOptions),
  // Show the spinner at once, as the old gate did, rather than after TanStack's default 1s.
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: SessionPending,
  errorComponent: SessionError,
  component: SessionOutlet,
});
