import { z } from 'zod';
import catalogJson from './catalog.json';

// Aligned with the worker's provider factory (`createLLM`).
export const modelProviderSchema = z.enum(['openai', 'anthropic']);

export type ModelProvider = z.infer<typeof modelProviderSchema>;

/** USD per million tokens. `cachedInput` is what a token served from the provider's prompt cache costs. */
const modelPricesSchema = z.object({
  input: z.number().positive(),
  cachedInput: z.number().positive(),
  output: z.number().positive(),
});

export type ModelPrices = z.infer<typeof modelPricesSchema>;

const modelSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().trim().min(1),
    provider: modelProviderSchema,
    contextWindow: z.number().int().positive(),
    /** The output tokens a call reserves; packHistory leaves this much room below the context window. */
    maxOutput: z.number().int().positive(),
    prices: modelPricesSchema,
  })
  .refine((model) => model.maxOutput < model.contextWindow, {
    message: 'maxOutput must leave room in the context window',
  })
  .refine((model) => model.prices.cachedInput <= model.prices.input, {
    message: 'cachedInput must not cost more than input',
  });

export type Model = z.infer<typeof modelSchema>;

// Parsed when this module loads, so a bad edit to catalog.json fails at startup and in CI, never at a call.
export const modelCatalogSchema = z
  .object({
    /** Bumped on every change to the file. */
    version: z.number().int().positive(),
    /** The day the list prices were last checked against the providers. */
    checkedAt: z.iso.date(),
    /** The Model each provider falls back to when none is requested. */
    defaultModels: z.record(modelProviderSchema, z.string()),
    models: z.array(modelSchema).min(1),
  })
  .refine(
    (catalog) => new Set(catalog.models.map((model) => model.id)).size === catalog.models.length,
    {
      message: 'a Model is listed twice',
    },
  )
  .refine(
    (catalog) =>
      Object.entries(catalog.defaultModels).every(
        ([provider, id]) => catalog.models.find((model) => model.id === id)?.provider === provider,
      ),
    { message: 'each default must be a catalog Model of its own provider' },
  );

const catalog = modelCatalogSchema.parse(catalogJson);

export const MODEL_CATALOG: readonly Model[] = catalog.models;

export const MODEL_CATALOG_VERSION = catalog.version;

export const DEFAULT_MODELS: Readonly<Record<ModelProvider, string>> = catalog.defaultModels;

// `map` loses the tuple shape `z.enum` needs; the ids are still exactly the catalog's.
export const MODEL_IDS = MODEL_CATALOG.map((model) => model.id) as [string, ...string[]];

export const modelIdSchema = z.enum(MODEL_IDS);

export const findModel = (id: string): Model | undefined =>
  MODEL_CATALOG.find((model) => model.id === id);

export const getModel = (id: string): Model => {
  const model = findModel(id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
};
