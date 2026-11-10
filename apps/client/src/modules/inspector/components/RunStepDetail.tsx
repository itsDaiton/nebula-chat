import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { InspectorRow } from '@/modules/inspector/components/InspectorRow';
import { RunStepDialog } from '@/modules/inspector/components/RunStepDialog';
import type { StepProps } from '@/modules/inspector/types/types';
import { formatDuration, runDurationMs } from '@/modules/inspector/utils/formatDuration';
import { formatJson } from '@/modules/inspector/utils/formatJson';
import { stepModel } from '@/modules/inspector/utils/stepModel';
import { resources } from '@/resources';
import { ProviderLogo } from '@/shared/components/ProviderLogo';

const {
  run,
  run: { step: text },
} = resources.inspector;

/** A Step's facts and a clipped look at its input; the whole input and output open in a dialog. */
export const RunStepDetail = ({ step }: StepProps) => {
  const { options } = useModelCatalog();
  const { name, phase, turn, tokens, attempt, error, input } = step;
  const model = stepModel(input);
  const provider = options.find((option) => option.value === model)?.provider;
  const duration = runDurationMs(step);

  return (
    <div className="mt-0.5 mb-1.5 flex flex-col gap-2 rounded-[10px] border border-border bg-panel p-2.5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
        {model && (
          <>
            <dt className="text-muted-foreground">{text.model}</dt>
            <dd className="flex min-w-0 items-center justify-end gap-1.5 font-mono text-foreground-secondary">
              {provider && <ProviderLogo provider={provider} className="size-[11px]" />}
              <span className="truncate">{model}</span>
            </dd>
          </>
        )}
        <InspectorRow label={phase === 'tool' ? text.tool : text.agent} value={name} />
        <InspectorRow label={text.phase} value={phase} />
        {turn > 0 && <InspectorRow label={text.turn} value={String(turn)} />}
        {tokens !== null && <InspectorRow label={text.tokens} value={run.tokens(tokens)} />}
        {duration !== null && (
          <InspectorRow label={text.duration} value={formatDuration(duration)} />
        )}
        {attempt > 1 && <InspectorRow label={text.attempt} value={String(attempt)} />}
        {error && (
          <>
            <dt className="text-muted-foreground">{text.error}</dt>
            <dd className="text-right font-mono text-destructive">{error.error}</dd>
          </>
        )}
      </dl>
      {error && <p className="text-xs text-foreground-secondary">{error.message}</p>}
      <p className="text-[11.5px] font-medium text-muted-foreground">{text.input}</p>
      <pre className="relative max-h-[92px] overflow-hidden rounded-lg border border-border bg-raised px-2.5 py-2 font-mono text-[11px] leading-[1.55] break-words whitespace-pre-wrap text-foreground-secondary after:absolute after:inset-x-0 after:bottom-0 after:h-[26px] after:bg-linear-to-b after:from-transparent after:to-raised">
        {formatJson(input)}
      </pre>
      <RunStepDialog step={step} />
    </div>
  );
};
