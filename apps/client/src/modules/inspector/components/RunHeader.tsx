import { RunStatusBadge } from '@/modules/inspector/components/RunStatusBadge';
import type { RunProps } from '@/modules/inspector/types/types';
import { formatDuration, runDurationMs } from '@/modules/inspector/utils/formatDuration';
import { formatSessionDate } from '@/modules/inspector/utils/formatSessionDate';
import { resources } from '@/resources';

const { run: text } = resources.inspector;

export const RunHeader = ({ run }: RunProps) => {
  const { status, steps, tokensUsed, tokenBudget, createdAt, startedAt } = run;
  const duration = runDurationMs(run);
  const facts = [
    text.steps(steps.length),
    ...(duration === null ? [] : [formatDuration(duration)]),
    formatSessionDate(startedAt ?? createdAt),
  ];

  return (
    <header className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <RunStatusBadge status={status} withDot />
        <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
          {facts.join(' · ')}
        </span>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 text-[11.5px] font-medium text-muted-foreground">
          <span>{text.budget}</span>
          <span className="font-mono tabular-nums">
            {tokenBudget ? text.budgetUsed(tokensUsed, tokenBudget) : text.tokens(tokensUsed)}
          </span>
        </div>
        {tokenBudget ? (
          <div
            role="progressbar"
            aria-label={text.budget}
            aria-valuemin={0}
            aria-valuemax={tokenBudget}
            aria-valuenow={Math.min(tokensUsed, tokenBudget)}
            className="h-1.5 overflow-hidden rounded-full bg-hover"
          >
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${Math.min(100, (tokensUsed / tokenBudget) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
};
