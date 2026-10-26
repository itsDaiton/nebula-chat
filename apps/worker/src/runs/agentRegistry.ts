import { analystAgent } from '@worker/agents/analyst';
import { criticAgent } from '@worker/agents/critic';
import { languageAgent } from '@worker/agents/language';
import { orchestratorAgent } from '@worker/agents/orchestrator';
import { outputAgent } from '@worker/agents/output';
import { sessionAgent } from '@worker/agents/session';
import type { AgentDefinition, DelegateDefinition } from '@worker/runs/agentDefinition';

// Intake Agents run on cheap Models; the Output Agent on a mid-tier one. The Session's Model never applies.
export const AGENTS = {
  language: languageAgent,
  session: sessionAgent,
  orchestrator: orchestratorAgent,
  output: outputAgent,
} as const satisfies Record<string, AgentDefinition>;

// The Agents the Orchestrator may delegate to; none of them is given another Agent as a tool.
export const DELEGATES = [
  analystAgent,
  criticAgent,
] as const satisfies readonly DelegateDefinition[];
