import { useCallback } from 'react';
import { toast } from 'sonner';
import { resources } from '@/resources';

/** Copies text and confirms with a toast; a refused clipboard (insecure origin, denied) is the one failure. */
export const useCopyToClipboard = () =>
  useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(resources.chat.meta.copied);
    } catch {
      toast.error(resources.chat.copyFailed);
    }
  }, []);
