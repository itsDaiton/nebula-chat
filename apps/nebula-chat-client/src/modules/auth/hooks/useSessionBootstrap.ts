import { useQuery } from '@tanstack/react-query';
import { ensureSession } from '@/libs/auth/utils/ensureSession';

const SESSION_BOOTSTRAP_KEY = ['auth', 'session-bootstrap'] as const;

/** Establishes a session once per page load; the session itself is read through useAuth. */
export const useSessionBootstrap = () =>
  useQuery({
    queryKey: SESSION_BOOTSTRAP_KEY,
    // Caches no session data (react-query rejects undefined), so better-auth's store stays the one source.
    queryFn: () => ensureSession().then(() => null),
    staleTime: Infinity,
    gcTime: Infinity,
  });
