import { HourglassIcon } from 'lucide-react';
import { resources } from '@/resources';

const { clarify } = resources.chat;

/** Under a Clarifying question: the Run waits for the answer, and what happens without one. */
export const ClarifyingQuestionNote = () => (
  <p
    role="note"
    className="mt-3 flex gap-2.5 rounded-xl border border-border bg-panel px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground"
  >
    <HourglassIcon className="mt-0.5 size-3.5 shrink-0" />
    <span>
      <span className="text-foreground-secondary">{clarify.waitingTitle}</span>{' '}
      <span>{clarify.waitingNote}</span>
    </span>
  </p>
);
