import { z } from 'zod';
import { StepPhase } from '@/libs/api/generated/model/stepPhase';
import type {
  ChatMessage,
  RunEvent,
  RunProgress,
  RunStepProgress,
  SseEvent,
} from '@/modules/chat/types/types';

const runEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('step-started'),
    stepId: z.string(),
    attempt: z.number(),
    phase: z.enum(StepPhase),
    agent: z.string(),
    label: z.string(),
  }),
  z.object({
    type: z.literal('step-finished'),
    stepId: z.string(),
    status: z.enum(['completed', 'failed']),
  }),
  z.object({
    type: z.literal('run-finished'),
    runId: z.string(),
    status: z.enum(['completed', 'partial', 'failed', 'cancelled']),
  }),
]);

export const EMPTY_RUN: RunProgress = { steps: [], status: null };

/** The Run event a frame carries; null when its data is not what the event promises. */
export const parseRunEvent = (event: SseEvent, data: unknown): RunEvent | null => {
  const result = runEventSchema.safeParse({ ...(data as object | null), type: event });
  return result.success ? result.data : null;
};

const withStep = (run: RunProgress, step: RunStepProgress): RunProgress => ({
  ...run,
  steps: run.steps.some(({ stepId }) => stepId === step.stepId)
    ? run.steps.map((known) => (known.stepId === step.stepId ? step : known))
    : [...run.steps, step],
});

/** The reply after one Run event: its Steps keep the order they first started in. */
export const applyRunEvent = (reply: ChatMessage, event: RunEvent): ChatMessage => {
  const run = reply.run ?? EMPTY_RUN;
  if (event.type === 'run-finished') {
    return { ...reply, runId: event.runId, run: { ...run, status: event.status } };
  }
  const known = run.steps.find(({ stepId }) => stepId === event.stepId);
  if (event.type === 'step-finished') {
    return known ? { ...reply, run: withStep(run, { ...known, status: event.status }) } : reply;
  }
  // The same or a lower attempt is a replay of a Step already shown.
  if (known && event.attempt <= known.attempt) return reply;
  const { stepId, attempt, phase, agent, label } = event;
  return {
    ...reply,
    // A re-run Output Step streams its tokens again, so what it wrote before goes.
    content: known && phase === 'output' ? '' : reply.content,
    run: withStep(run, { stepId, attempt, phase, agent, label, status: 'running' }),
  };
};
