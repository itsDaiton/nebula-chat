import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/utils/sessionBootstrap';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';

/** Drops the previous user's server state and returns to the chat root, or to the CLI code a sign-in was for. */
export const useIdentityChange = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { device } = useSearch({ strict: false });
  const bootstrapHash = hashKey(SESSION_BOOTSTRAP_KEY);
  const clearMessageAllowanceReached = useChatStreamStore(
    (state) => state.clearMessageAllowanceReached,
  );
  const closeSettings = useSettingsDialogStore((state) => state.closeSettings);

  return () => {
    // Removed, not reset: nothing refetches as the old user, and claimed sessions load fresh.
    queryClient.removeQueries({ predicate: (query) => query.queryHash !== bootstrapHash });
    // A spent allowance belonged to the previous Guest; a new identity starts afresh.
    clearMessageAllowanceReached();
    // The dialog was the previous user's.
    closeSettings();
    void navigate(device ? { to: '/device', search: { user_code: device } } : { to: '/' });
  };
};
