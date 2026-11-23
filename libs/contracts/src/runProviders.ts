import type { ModelProvider } from './models/modelCatalog';

/** The providers a Run's Agents call, which the server needs to pick Own keys; a worker test fails when the Agents drift from it. */
export const RUN_PROVIDERS = ['openai'] as const satisfies readonly ModelProvider[];
