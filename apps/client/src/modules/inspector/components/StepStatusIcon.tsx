import { CircleCheckIcon, CircleXIcon, LoaderCircleIcon } from 'lucide-react';
import type { StepStatusIconProps } from '@/modules/inspector/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const looks = {
  completed: { icon: CircleCheckIcon, tone: 'text-success' },
  failed: { icon: CircleXIcon, tone: 'text-destructive' },
  running: { icon: LoaderCircleIcon, tone: 'animate-spin text-foreground-secondary' },
};

export const StepStatusIcon = ({ status }: StepStatusIconProps) => {
  const { icon: Icon, tone } = looks[status];
  return (
    <Icon
      role="img"
      aria-label={resources.inspector.run.stepStatus[status]}
      className={cn('size-[15px] shrink-0', tone)}
    />
  );
};
