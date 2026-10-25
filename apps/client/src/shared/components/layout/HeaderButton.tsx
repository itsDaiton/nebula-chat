import { ShortcutKeys } from '@/shared/components/layout/ShortcutKeys';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { HeaderButtonProps } from '@/shared/types/types';

/** An icon button in the header, named by `label`, whose tooltip repeats the label and its shortcut. */
export const HeaderButton = ({ label, shortcut, children, ...props }: HeaderButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={<Button variant="ghost" size="icon-sm" aria-label={label} {...props} />}
    >
      {children}
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <span>{label}</span>
      {shortcut && <ShortcutKeys shortcut={shortcut} />}
    </TooltipContent>
  </Tooltip>
);
