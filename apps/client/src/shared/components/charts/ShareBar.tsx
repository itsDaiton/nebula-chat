import { cn } from '@/shared/utils/cn';
import type { ShareBarProps } from '@/shared/types/types';

export const ShareBar = ({ share, active = false }: ShareBarProps) => (
  <div className="bg-border h-[3px] w-full overflow-hidden rounded-full" aria-hidden="true">
    <div
      className={cn('h-full rounded-full', active ? 'bg-foreground' : 'bg-muted-foreground/60')}
      style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }}
    />
  </div>
);
