import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import { route } from '@/routing/routes';

/** Drops the previous user's server state and returns to the chat root. */
export const useIdentityChange = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bootstrapHash = hashKey(SESSION_BOOTSTRAP_KEY);
  const clearMessageAllowanceReached = useChatStreamStore(
    (state) => state.clearMessageAllowanceReached,
  );
  const clearSettingsSearch = useSettingsSearchStore((state) => state.clearSearch);

  return () => {
    // Removed, not reset: nothing refetches as the old user, and claimed conversations load fresh.
    queryClient.removeQueries({ predicate: (query) => query.queryHash !== bootstrapHash });
    // A spent allowance belonged to the previous Guest; a new identity starts afresh.
    clearMessageAllowanceReached();
    clearSettingsSearch();
    void navigate(route.chat.root());
  };
};
