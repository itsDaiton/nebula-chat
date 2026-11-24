import { z } from 'zod';
import { RUN_STATUSES, STEP_STATUSES } from '@nebula-chat/db';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

export const runIdParamsSchema = z.object({
  runId: z.uuid(),
});

const parametersSchema = z.object({
  temperature: z.number().optional(),
  maxTokens: z.number().int().optional(),
});

// Mirrors what the worker persists; a field not declared here is stripped from the response.
const modelCallInputShape = {
  model: z.string(),
  parameters: parametersSchema,
  system: z.string().describe('The system prompt the Agent was sent'),
};

const toolCallSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
});

const transcriptMessageSchema = z.object({
  type: z.string(),
  content: z.string(),
  toolCalls: z.array(toolCallSchema).max(100).optional(),
  toolCallId: z.string().optional(),
});

const briefSchema = z
  .object({
    language: z
      .object({ language: z.string(), englishRestatement: z.string() })
      .nullable()
      .describe('The Language Agent’s output; null when it failed'),
    session: z
      .object({ summary: z.string() })
      .nullable()
      .describe('The Session Agent’s output; null when it failed'),
    missing: z.array(z.string()).max(10).describe('The Intake Agents that failed'),
  })
  .meta({ id: 'Brief' });

const stepBaseShape = {
  id: z.uuid(),
  turn: z.number().int().describe('The Orchestrator turn the Step belongs to; 0 outside the loop'),
  name: z.string().describe('The Agent, or the tool'),
  parentStepId: z
    .uuid()
    .nullable()
    .describe('The turn’s Orchestrator Step for a delegate; the delegate for a tool call'),
  attempt: z.number().int().describe('1 the first time; higher when the Step re-ran on resume'),
  tokens: z.number().int().nullable().describe('Tokens the Step used; null for a tool call'),
  status: z.enum(STEP_STATUSES).meta({ id: 'StepStatus' }),
  error: errorEnvelopeSchema.nullable().describe('Why a failed Step failed'),
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
};

const humanInputShape = { ...modelCallInputShape, human: z.string() };

// `output` is null until the Step completes.
const stepSchema = z
  .discriminatedUnion('phase', [
    z.object({
      ...stepBaseShape,
      phase: z.literal('intake'),
      input: z.object(humanInputShape).describe('Everything the Agent was sent'),
      output: z
        .union([
          z.object({ language: z.string(), englishRestatement: z.string() }),
          z.object({ summary: z.string() }),
        ])
        .nullable(),
    }),
    z.object({
      ...stepBaseShape,
      phase: z.literal('orchestrator'),
      input: z
        .object({ ...modelCallInputShape, messages: z.array(transcriptMessageSchema).max(1000) })
        .describe('Everything the Orchestrator was sent'),
      output: z
        .object({ content: z.string(), toolCalls: z.array(toolCallSchema).max(100) })
        .nullable(),
    }),
    z.object({
      ...stepBaseShape,
      phase: z.literal('delegate'),
      input: z
        .object({ ...modelCallInputShape, toolCallId: z.string(), task: z.string() })
        .describe('Everything the delegate was sent'),
      output: z.object({ result: z.string() }).nullable(),
    }),
    z.object({
      ...stepBaseShape,
      phase: z.literal('tool'),
      input: z
        .union([z.object({ query: z.string() }), z.object({ url: z.string() })])
        .describe('The arguments of the tool call'),
      output: z.object({ result: z.string() }).nullable(),
    }),
    z.object({
      ...stepBaseShape,
      phase: z.literal('output'),
      input: z.object(humanInputShape).describe('Everything the Output Agent was sent'),
      output: z.object({ answer: z.string() }).nullable(),
    }),
  ])
  .meta({ id: 'Step' });

export const runResponseSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    status: z.enum(RUN_STATUSES),
    brief: briefSchema
      .nullable()
      .describe('The Intake Agents’ outputs keyed by Agent; null until Intake ends'),
    tokensUsed: z.number().int(),
    tokenBudget: z.number().int().nullable().describe('The Run budget; null until the Run starts'),
    createdAt: isoDateTimeSchema,
    startedAt: isoDateTimeSchema.nullable(),
    finishedAt: isoDateTimeSchema.nullable(),
    steps: z.array(stepSchema).max(1000).describe('In execution order'),
  })
  .meta({ id: 'Run' });
