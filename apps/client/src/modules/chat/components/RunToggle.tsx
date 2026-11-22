import { WorkflowIcon } from 'lucide-react';
import { useRunMode } from '@/modules/chat/hooks/useRunMode';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/cn';

/** Picks a new chat's Reply mode, then shows the Session's; disabled for a Guest, in a Session and while a Run waits, with why. */
export const RunToggle = () => {
  const { canRun, isRegistered, isAnswering, isRunMode, toggleRunMode } = useRunMode();
  const { label, hint, guest, locked } = resources.chat.run;
  const blocked = !isRegistered ? guest : isAnswering ? resources.chat.clarify.answerHint : locked;

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
              !canRun && !isRunMode && 'border-dashed text-faint',
              canRun && !isRunMode && 'text-muted-foreground',
            )}
          />
        }
      >
        <WorkflowIcon className="size-3.5" />
        {label}
      </TooltipTrigger>
      <TooltipContent>{canRun ? hint : blocked}</TooltipContent>
    </Tooltip>
  );
};
