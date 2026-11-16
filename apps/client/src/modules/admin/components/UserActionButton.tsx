import type { UserActionButtonProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';

/** `aria-disabled`, not `disabled`, so a disabled action stays focusable and its reason is reachable by keyboard. */
export const UserActionButton = ({
  label,
  icon,
  disabledReason,
  onClick,
}: UserActionButtonProps) => {
  if (!disabledReason) {
    return (
      <Button variant="outline" className="w-full justify-start" onClick={onClick}>
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start opacity-50"
            aria-disabled
            aria-label={resources.admin.users.actions.disabledName(label, disabledReason)}
          />
        }
      >
        {icon}
        {label}
      </TooltipTrigger>
      <TooltipContent side="left">{disabledReason}</TooltipContent>
    </Tooltip>
  );
};
