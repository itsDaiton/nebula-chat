import type { Run } from '@/libs/api/generated/model/run';
import type { RunProgress } from '@/modules/chat/types/types';
import { stepLabel } from '@/modules/inspector/utils/stepLabel';

const END_STATUSES: ReadonlySet<Run['status']> = new Set([
  'completed',
  'partial',
  'failed',
  'cancelled',
]);

/** A saved Run as the stream would have reported it, so the chat draws both with the same card. */
export const mapSavedRun = ({ status, steps }: Run): RunProgress => ({
  status: END_STATUSES.has(status) ? (status as NonNullable<RunProgress['status']>) : null,
  steps: steps.map(({ id, attempt, phase, name, status: stepStatus, turn, parentStepId }) => ({
    stepId: id,
    attempt,
    phase,
    agent: name,
    label: stepLabel(name),
    status: stepStatus,
    turn,
    parentStepId,
  })),
});
