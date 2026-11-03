import { useCallback, useId } from 'react';
import { toast } from 'sonner';
import { resources } from '@/resources';
import { useCopiedStore } from '@/shared/stores/useCopiedStore';

const COPIED_MS = 2000;
let resetTimer: ReturnType<typeof setTimeout> | undefined;

/** Copies text and confirms with a toast; `copied` stays true briefly so the button can show it. A refused clipboard (insecure origin, denied) is the one failure. */
export const useCopyToClipboard = () => {
  const id = useId();
  const copied = useCopiedStore((state) => state.copiedId === id);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(resources.chat.meta.copied);
        useCopiedStore.getState().setCopiedId(id);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => useCopiedStore.getState().setCopiedId(null), COPIED_MS);
      } catch {
        toast.error(resources.chat.copyFailed);
      }
    },
    [id],
  );

  return { copy, copied };
};
