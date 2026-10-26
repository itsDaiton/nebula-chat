import type { AgentDefinition } from '@worker/agents/agentDefinition';
import { languageDetection } from '@worker/agents/languageDetection';
import { output } from '@worker/agents/output';
import { sessionSummary } from '@worker/agents/sessionSummary';

// Intake Agents run on cheap Models; the Output Agent on a mid-tier one. The Session's Model never applies.
export const AGENTS = {
  languageDetection,
  sessionSummary,
  output,
} as const satisfies Record<string, AgentDefinition>;
