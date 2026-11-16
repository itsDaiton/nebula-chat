import { formatJson } from '@/modules/inspector/utils/formatJson';

/** An Intake Agent's output as `field: value` lines; anything that isn't a plain object falls back to JSON. */
export const formatBriefPart = (part: unknown) =>
  typeof part === 'object' && part !== null && !Array.isArray(part)
    ? Object.entries(part)
        .map(([field, value]) => `${field}: ${formatJson(value)}`)
        .join('\n')
    : formatJson(part);
