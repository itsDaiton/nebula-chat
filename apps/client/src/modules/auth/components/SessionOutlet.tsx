import { useQuery } from '@tanstack/react-query';
import { Outlet } from '@tanstack/react-router';
import { SessionError } from '@/modules/auth/components/SessionError';
import { SessionPending } from '@/modules/auth/components/SessionPending';
import { sessionBootstrapOptions } from '@/modules/auth/utils/sessionBootstrap';

// The guard has already resolved the session on the way in; this holds the app back when sign-out
// resets it, so nothing fetches as nobody while a Guest is re-minted.
export const SessionOutlet = () => {
  const { isPending, isError } = useQuery(sessionBootstrapOptions);

  if (isPending) return <SessionPending />;
  if (isError) return <SessionError />;
  return <Outlet />;
};
