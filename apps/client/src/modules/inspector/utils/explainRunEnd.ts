import type { Run } from '@/libs/api/generated/model/run';
import type { RunEndExplanation } from '@/modules/inspector/types/types';
import { stepLabel } from '@/modules/inspector/utils/stepLabel';
import { resources } from '@/resources';

const { end } = resources.inspector.run;

const missingAgents = (brief: Run['brief']): string[] => {
  const missing: unknown = brief?.missing;
  return Array.isArray(missing) ? missing.filter((name) => typeof name === 'string') : [];
};

const partialReason = ({ brief, steps }: Run) => {
  const missing = missingAgents(brief);
  const reasons = [
    ...missing.map((name) => end.agentFailed(stepLabel(name), name)),
    ...steps
      .filter(({ status, name }) => status === 'failed' && !missing.includes(name))
      .map(({ name, turn }) => end.agentFailed(stepLabel(name), name, turn)),
  ];
  return reasons.length > 0 ? reasons.join(' ') : end.partialFallback;
};

/** Why a Run ended short of `completed`; null for one that completed or is still going. */
export const explainRunEnd = (run: Run): RunEndExplanation | null => {
  switch (run.status) {
    case 'partial':
      return { title: end.partialTitle, reason: partialReason(run) };
    case 'failed':
      return {
        title: end.failedTitle,
        reason:
          run.steps.findLast(({ status }) => status === 'failed')?.error?.message ??
          end.failedFallback,
      };
    case 'cancelled':
      return { title: end.cancelledTitle, reason: end.cancelledReason };
    default:
      return null;
  }
};
