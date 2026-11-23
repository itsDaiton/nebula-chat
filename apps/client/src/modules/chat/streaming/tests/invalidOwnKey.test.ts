import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offerSettingsForInvalidKey } from '@/modules/chat/streaming/invalidOwnKey';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const envelope = (error: string) =>
  JSON.stringify({ success: false, error, message: 'Your openai API key cannot be used.' });

beforeEach(() => {
  vi.clearAllMocks();
  useSettingsDialogStore.setState({ isOpen: false, section: 'profile' });
});

describe('offerSettingsForInvalidKey', () => {
  it('toasts the error with an action that opens the API keys section', () => {
    offerSettingsForInvalidKey({ event: 'error', data: envelope('InvalidOwnKey') });

    const [message, options] = vi.mocked(toast.error).mock.calls[0]!;
    expect(message).toBe('Your openai API key cannot be used.');
    const action = options?.action as unknown as { onClick: () => void };
    action.onClick();
    expect(useSettingsDialogStore.getState()).toMatchObject({ isOpen: true, section: 'keys' });
  });

  it('ignores other errors, other events and unparseable data', () => {
    offerSettingsForInvalidKey({ event: 'error', data: envelope('Internal') });
    offerSettingsForInvalidKey({ event: 'token', data: envelope('InvalidOwnKey') });
    offerSettingsForInvalidKey({ event: 'error', data: 'not json' });

    expect(toast.error).not.toHaveBeenCalled();
  });
});
