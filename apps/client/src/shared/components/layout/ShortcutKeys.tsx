import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
import { useOS } from '@/shared/hooks/useOS';
import type { ShortcutKeysProps } from '@/shared/types/types';
import { getShortcutKeys } from '@/shared/utils/osUtils';

/** A shortcut's keys as the user's OS names them (`⌘` on a Mac, `Ctrl` elsewhere). */
export const ShortcutKeys = ({ shortcut, className }: ShortcutKeysProps) => {
  const os = useOS();

  return (
    <KbdGroup className={className}>
      {getShortcutKeys(shortcut, os).map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
};
