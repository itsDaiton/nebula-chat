import type { AgentDefinition } from '@worker/runs/agentDefinition';
import type { Brief } from '@worker/runs/brief';

// On a strong Model: it decides what the Run does. Its only tools are the delegate Agents.
export const orchestratorAgent = {
  name: 'orchestrator',
  label: 'Planning the work',
  model: 'gpt-4.1',
  prompt: 'orchestrator',
  tools: [],
  parameters: { temperature: 0.2 },
} as const satisfies AgentDefinition;

export const orchestratorInput = (brief: Brief, message: string): string =>
  `# Brief\n\n\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n\n# The user's message\n\n${message}`;
