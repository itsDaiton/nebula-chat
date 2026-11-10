import { z } from 'zod';
import { RUN_STATUSES, STEP_PHASES, STEP_STATUSES } from '@nebula-chat/db';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

export const runIdParamsSchema = z.object({
  runId: z.uuid(),
});

const stepSchema = z
  .object({
    id: z.uuid(),
    turn: z
      .number()
      .int()
      .describe('The Orchestrator turn the Step belongs to; 0 outside the loop'),
    phase: z.enum(STEP_PHASES),
    name: z.string().describe('The Agent, or the tool'),
    parentStepId: z
      .uuid()
      .nullable()
      .describe('The turn’s Orchestrator Step for a delegate; the delegate for a tool call'),
    attempt: z.number().int().describe('1 the first time; higher when the Step re-ran on resume'),
    input: z.unknown().describe('Everything the Agent or tool was sent'),
    output: z.unknown().describe('What it returned; null until the Step completes'),
    tokens: z.number().int().nullable().describe('Tokens the Step used; null for a tool call'),
    status: z.enum(STEP_STATUSES),
    error: errorEnvelopeSchema.nullable().describe('Why a failed Step failed'),
    startedAt: isoDateTimeSchema,
    finishedAt: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'Step' });

export const runResponseSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    status: z.enum(RUN_STATUSES),
    brief: z
      .record(z.string(), z.unknown())
      .nullable()
      .describe(
        'The Intake Agents’ outputs keyed by Agent, null for one that failed, plus `missing` naming those; null until Intake ends',
      ),
    tokensUsed: z.number().int(),
    tokenBudget: z.number().int().nullable().describe('The Run budget; null until the Run starts'),
    createdAt: isoDateTimeSchema,
    startedAt: isoDateTimeSchema.nullable(),
    finishedAt: isoDateTimeSchema.nullable(),
    steps: z.array(stepSchema).max(1000).describe('In execution order'),
  })
  .meta({ id: 'Run' });
