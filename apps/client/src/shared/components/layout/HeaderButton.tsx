import { Button } from '@/shared/components/ui/button';
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { useOS } from '@/shared/hooks/useOS';
import type { HeaderButtonProps } from '@/shared/types/types';
import { getShortcutKeys } from '@/shared/utils/osUtils';

/** An icon button in the header, named by `label`, whose tooltip repeats the label and its shortcut. */
export const HeaderButton = ({ label, shortcut, children, ...props }: HeaderButtonProps) => {
  const os = useOS();

  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} {...props} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span>{label}</span>
        {shortcut && (
          <KbdGroup>
            {getShortcutKeys(shortcut, os).map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </KbdGroup>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
