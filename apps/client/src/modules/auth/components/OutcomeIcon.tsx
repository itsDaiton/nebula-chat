import type { OutcomeIconProps } from '@/modules/auth/types/types';
import { cn } from '@/shared/utils/cn';

/** The status icon heading an outcome card, in its status colour. */
export const OutcomeIcon = ({ icon: Icon, className }: OutcomeIconProps) => (
  <div className="mb-3.5 flex size-10 items-center justify-center rounded-xl border border-border-strong">
    <Icon aria-hidden className={cn('size-[18px]', className)} />
  </div>
);
