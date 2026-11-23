import type { Brief } from '@worker/runs/brief';

// The Brief goes down as the JSON the Intake Agents produced, not a prose rendering of it.
export const outputInput = (brief: Brief, message: string, findings: string): string =>
  `# Brief\n\n\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n\n# Findings\n\n${findings}\n\n# The user's message\n\n${message}`;
