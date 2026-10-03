import { useQuery } from '@tanstack/react-query';
import { ensureSession } from '@/libs/auth/utils/ensureSession';

const SESSION_BOOTSTRAP_KEY = ['auth', 'session-bootstrap'] as const;

/** Establishes a session once per page load; later session changes go through useAuth. */
export const useSessionBootstrap = () =>
  useQuery({
    queryKey: SESSION_BOOTSTRAP_KEY,
    queryFn: ensureSession,
    staleTime: Infinity,
    gcTime: Infinity,
  });
