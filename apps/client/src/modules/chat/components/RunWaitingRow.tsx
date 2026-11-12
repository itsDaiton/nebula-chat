import { WorkflowIcon } from 'lucide-react';
import { resources } from '@/resources';

const { run: text, meta, clarify } = resources.chat;

/** A waiting Run's progress, collapsed to one row above its Clarifying question. */
export const RunWaitingRow = ({ stepsCompleted }: { stepsCompleted: number }) => (
  <section
    aria-label={text.progress}
    className="mb-4 rounded-xl border border-border bg-panel px-3 py-2.5"
  >
    <h3 className="flex items-center gap-2 text-[12.5px] text-foreground-secondary">
      <WorkflowIcon className="size-3.5" />
      {meta.run}
      <span className="font-mono text-[11px] text-muted-foreground">
        {clarify.waitingRow(stepsCompleted)}
      </span>
    </h3>
  </section>
);
