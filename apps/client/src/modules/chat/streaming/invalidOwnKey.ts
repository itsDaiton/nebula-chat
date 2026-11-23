import { parseErrorEnvelope } from '@nebula-chat/errors';
import { toast } from 'sonner';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import type { SseFrame } from '@/modules/chat/types/types';
import { resources } from '@/resources';

/** A reply that failed on the User's own key gets a way to Settings, where the key is replaced. */
export const offerSettingsForInvalidKey = ({ event, data }: SseFrame): void => {
  if (event !== 'error') return;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }
  const envelope = parseErrorEnvelope(parsed);
  if (envelope?.error !== 'InvalidOwnKey') return;
  toast.error(envelope.message, {
    action: {
      label: resources.chat.invalidOwnKeyAction,
      onClick: () => useSettingsDialogStore.getState().openSettings('keys'),
    },
  });
};
