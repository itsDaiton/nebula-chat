import { WorkflowIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';

// A placeholder until Runs go live (#652): disabled for everyone, with the reason a User needs.
export const RunToggle = () => {
  const { isGuest } = useAuth();
  const { label, soon, guest } = resources.chat.run;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            focusableWhenDisabled
            className="h-7 rounded-full border-dashed px-2.5 text-[12.5px] text-faint"
          />
        }
      >
        <WorkflowIcon className="size-3.5" />
        {label}
      </TooltipTrigger>
      <TooltipContent>{isGuest ? guest : soon}</TooltipContent>
    </Tooltip>
  );
};
