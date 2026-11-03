import { ThemePreviewHalf } from '@/modules/settings/components/ThemePreviewHalf';
import type { ThemePreviewProps } from '@/modules/settings/types/types';

/** The theme in miniature; System is split, light beside dark. */
export const ThemePreview = ({ mode }: ThemePreviewProps) => (
  <span aria-hidden className="flex h-20 overflow-hidden border-b border-border">
    {mode !== 'dark' && <ThemePreviewHalf dark={false} />}
    {mode !== 'light' && <ThemePreviewHalf dark />}
  </span>
);
