import { WorkflowIcon } from 'lucide-react';
import { useRunMode } from '@/modules/chat/hooks/useRunMode';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/cn';

/** Sends the next message as a Run; a Guest sees it disabled, with what unlocks it. */
export const RunToggle = () => {
  const { canRun, isRunMode, toggleRunMode } = useRunMode();
  const { label, hint, guest } = resources.chat.run;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={isRunMode ? 'default' : 'outline'}
            size="sm"
            disabled={!canRun}
            focusableWhenDisabled
            aria-pressed={isRunMode}
            onClick={toggleRunMode}
            className={cn(
              'h-7 rounded-full px-2.5 text-[12.5px]',
              !canRun && 'border-dashed text-faint',
              canRun && !isRunMode && 'text-muted-foreground',
            )}
          />
        }
      >
        <WorkflowIcon className="size-3.5" />
        {label}
      </TooltipTrigger>
      <TooltipContent>{canRun ? hint : guest}</TooltipContent>
    </Tooltip>
  );
};
