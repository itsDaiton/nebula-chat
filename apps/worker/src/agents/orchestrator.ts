import type { Brief } from '@worker/runs/brief';

export const orchestratorInput = (brief: Brief, message: string): string =>
  `# Brief\n\n\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n\n# The user's message\n\n${message}`;
