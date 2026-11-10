import type { StepIoProps } from '@/modules/inspector/types/types';
import { formatJson } from '@/modules/inspector/utils/formatJson';

/** One side of a Step in full, scrolling inside the dialog. */
export const StepIo = ({ label, value }: StepIoProps) => (
  <section className="flex min-h-0 flex-col gap-1.5">
    <h3 className="text-[11.5px] font-medium text-muted-foreground">{label}</h3>
    <pre className="max-h-[32vh] overflow-auto rounded-lg border border-border bg-raised px-2.5 py-2 font-mono text-[11px] leading-[1.55] break-words whitespace-pre-wrap text-foreground-secondary">
      {formatJson(value)}
    </pre>
  </section>
);
