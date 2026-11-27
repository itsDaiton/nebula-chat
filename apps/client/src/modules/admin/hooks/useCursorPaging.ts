import { useRouter } from '@tanstack/react-router';
import type { CursorPagingOptions } from '@/modules/admin/types/types';

/** What an `AdminDataTable` needs to page: each page is a history entry, so Previous goes back one. */
export const useCursorPaging = ({ cursor, onCursor, onRestart }: CursorPagingOptions) => {
  const router = useRouter();

  return {
    canPrevious: Boolean(cursor),
    onNext: onCursor,
    onPrevious: () => {
      if (router.history.canGoBack()) router.history.back();
      else onRestart();
    },
  };
};
