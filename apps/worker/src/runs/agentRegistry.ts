import { languageAgent } from '@worker/agents/language';
import { outputAgent } from '@worker/agents/output';
import { sessionAgent } from '@worker/agents/session';
import type { AgentDefinition } from '@worker/runs/agentDefinition';

// Intake Agents run on cheap Models; the Output Agent on a mid-tier one. The Session's Model never applies.
export const AGENTS = {
  language: languageAgent,
  session: sessionAgent,
  output: outputAgent,
} as const satisfies Record<string, AgentDefinition>;
