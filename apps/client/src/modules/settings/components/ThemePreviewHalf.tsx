import type { ThemePreviewHalfProps } from '@/modules/settings/types/types';
import { cn } from '@/shared/utils/cn';

export const ThemePreviewHalf = ({ dark }: ThemePreviewHalfProps) => (
  <span
    className={cn(
      'flex h-full flex-1 items-center justify-center gap-1 p-2',
      dark ? 'bg-neutral-950' : 'bg-white',
    )}
  >
    <span className={cn('h-full w-3 rounded', dark ? 'bg-neutral-800' : 'bg-neutral-200')} />
    <span className={cn('h-full flex-1 rounded', dark ? 'bg-neutral-800' : 'bg-neutral-100')} />
  </span>
);
