import { z } from 'zod';
import { ownKeyRefsSchema } from './ownKeyRefs';

/** The delayed jobs that end a Clarifying question's wait (ADR-0033 §6); the worker schedules and consumes them. */
export const CLARIFYING_QUESTION_TIMEOUT_QUEUE = 'clarifying-question-timeout';

export const clarifyingQuestionTimeoutJobSchema = z.object({
  runId: z.uuid(),
  // Carried over so the timeout's resume runs on the same Own keys as the Run did.
  keyRefs: ownKeyRefsSchema.optional(),
});

export type ClarifyingQuestionTimeoutJob = z.infer<typeof clarifyingQuestionTimeoutJobSchema>;

/** One job per Run, so the server can find it to remove or promote it. */
export const clarifyingQuestionTimeoutJobId = (runId: string): string =>
  `clarifying-question-timeout-${runId}`;
