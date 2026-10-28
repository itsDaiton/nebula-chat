import { act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCopyToClipboard', () => {
  it('copies the text and confirms it', async () => {
    userEvent.setup();
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copy('some text'));

    expect(await navigator.clipboard.readText()).toBe('some text');
    expect(toast.success).toHaveBeenCalledWith(resources.chat.meta.copied);
    expect(result.current.copied).toBe(true);
  });

  it('says so when the clipboard refuses', async () => {
    userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copy('some text'));

    expect(toast.error).toHaveBeenCalledWith(resources.chat.copyFailed);
    expect(toast.success).not.toHaveBeenCalled();
    expect(result.current.copied).toBe(false);
  });
});
