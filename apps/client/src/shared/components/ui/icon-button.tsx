import * as React from 'react';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, 'aria-label' | 'children'> & {
  /** Names the action: the accessible name and the tooltip. */
  label: string;
  side?: React.ComponentProps<typeof TooltipContent>['side'];
  children: React.ReactNode;
};

// Every icon-only button in the client goes through this, so none is unnamed on hover.
const IconButton = ({ label, side = 'top', children, ...props }: IconButtonProps) => (
  <Tooltip>
    <TooltipTrigger render={<Button aria-label={label} {...props} />}>{children}</TooltipTrigger>
    <TooltipContent side={side}>{label}</TooltipContent>
  </Tooltip>
);

export { IconButton };
