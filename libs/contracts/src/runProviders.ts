import type { ModelProvider } from './models/modelCatalog';

/** The providers a Run's Agents call; a worker test fails when the Agents drift from it. */
export const RUN_PROVIDERS = ['openai'] as const satisfies readonly ModelProvider[];
