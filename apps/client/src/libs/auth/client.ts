import { anonymousClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';

// The single auth entry point; auth is not in openapi.yaml, so it bypasses Orval.
export const authClient = createAuthClient({
  baseURL: SERVER_CONFIG.BASE_URL,
  // Sends the better-auth session cookie cross-origin.
  fetchOptions: { credentials: 'include' },
  plugins: [anonymousClient()],
});
