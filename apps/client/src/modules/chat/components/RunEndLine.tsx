import { CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import type { RunEndLineProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { end } = resources.inspector.run;

const looks = {
  partial: {
    icon: TriangleAlertIcon,
    tone: 'border-warning/25 bg-warning/8 text-warning',
    title: end.partialTitle,
  },
  failed: {
    icon: CircleXIcon,
    tone: 'border-destructive/25 bg-destructive/8 text-destructive',
    title: end.failedTitle,
  },
};

/** Why a Run's answer fell short, under it; nothing for a Run that completed, was cancelled or is still going. */
export const RunEndLine = ({ run }: RunEndLineProps) => {
  const { status, steps } = run;
  if (status !== 'partial' && status !== 'failed') return null;
  const { icon: Icon, tone, title } = looks[status];
  const intakeFailed = steps.some((step) => step.phase === 'intake' && step.status === 'failed');
  const partialReason = intakeFailed ? resources.chat.run.intakeFailed : end.partialFallback;
  const reason = status === 'failed' ? end.failedFallback : partialReason;

  return (
    <p
      role="note"
      className={cn('mt-0.5 mb-1.5 flex gap-2 rounded-[10px] border px-3 py-2 text-[12.5px]', tone)}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <span className="font-medium">{title}</span>{' '}
        <span className="text-foreground-secondary">{reason}</span>
      </span>
    </p>
  );
};
