import { BanIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import type { RunProps } from '@/modules/inspector/types/types';
import { explainRunEnd } from '@/modules/inspector/utils/explainRunEnd';
import { cn } from '@/shared/utils/cn';

const looks = {
  partial: { icon: TriangleAlertIcon, tone: 'border-warning/25 bg-warning/8 text-warning' },
  failed: { icon: CircleXIcon, tone: 'border-destructive/25 bg-destructive/8 text-destructive' },
  cancelled: { icon: BanIcon, tone: 'border-border bg-raised text-muted-foreground' },
};

/** Why the Run ended short of `completed`; nothing for one that completed or is still going. */
export const RunEndNotice = ({ run }: RunProps) => {
  const explanation = explainRunEnd(run);
  const { status } = run;
  if (!explanation || !(status === 'partial' || status === 'failed' || status === 'cancelled')) {
    return null;
  }
  const { icon: Icon, tone } = looks[status];

  return (
    <p role="note" className={cn('flex gap-2 rounded-[10px] border px-3 py-2 text-[12.5px]', tone)}>
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <span className="font-medium">{explanation.title}</span>{' '}
        <span className="text-foreground-secondary">{explanation.reason}</span>
      </span>
    </p>
  );
};
