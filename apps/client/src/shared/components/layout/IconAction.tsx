import { Button } from '@/shared/components/ui/button';
import { Kbd } from '@/shared/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { IconActionProps } from '@/shared/types/types';

export const IconAction = ({ label, shortcut, pressed, onClick, children }: IconActionProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          className="size-[30px] text-muted-foreground hover:text-foreground [&_svg:not([class*='size-'])]:size-[18px]"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent side="bottom">
      {label}
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </TooltipContent>
  </Tooltip>
);
