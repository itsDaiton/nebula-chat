import { CircleStopIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import type { RunEndLineProps, RunStepProgress } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { end } = resources.inspector.run;
const { run: text } = resources.chat;

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
  cancelled: {
    icon: CircleStopIcon,
    tone: 'border-border bg-raised text-muted-foreground',
    title: end.cancelledTitle,
  },
};

const partialReason = (steps: RunStepProgress[]) => {
  const failed = steps.filter(({ status }) => status === 'failed');
  const reasons = [
    ...(failed.some(({ phase }) => phase === 'intake') ? [text.intakeFailed] : []),
    ...failed
      .filter(({ phase }) => phase === 'delegate')
      .map(({ label, agent, turn }) => end.agentFailed(label, agent, turn)),
  ];
  return reasons.length > 0 ? reasons.join(' ') : end.partialFallback;
};

/** Why a Run's answer fell short, under it; nothing for a Run that completed or is still going. */
export const RunEndLine = ({ run }: RunEndLineProps) => {
  const { status, steps } = run;
  if (status === null || status === 'completed') return null;
  const { icon: Icon, tone, title } = looks[status];
  const reason = {
    partial: partialReason(steps),
    failed: end.failedFallback,
    cancelled: text.cancelledReason,
  }[status];

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
