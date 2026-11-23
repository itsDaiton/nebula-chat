import { z } from 'zod';
import { modelIdSchema } from '@nebula-chat/contracts';
import analystJson from '@worker/agents/analyst.json';
import criticJson from '@worker/agents/critic.json';
import languageJson from '@worker/agents/language.json';
import orchestratorJson from '@worker/agents/orchestrator.json';
import outputJson from '@worker/agents/output.json';
import researcherJson from '@worker/agents/researcher.json';
import sessionJson from '@worker/agents/session.json';
import { PROMPT_NAMES } from '@worker/llm/prompts';

// The fixed set: the loader fails on a missing or extra Agent, so the typed accessors stay literal.
const AGENT_NAMES = ['language', 'session', 'orchestrator', 'output'] as const;
// The Orchestrator lists its delegates in this order.
const DELEGATE_NAMES = ['analyst', 'critic', 'researcher'] as const;

export const toolNameSchema = z.enum(['web_search', 'web_fetch']);

// `YYYY-MM-DD-<uuid>`, as for the model catalog.
const versionSchema = z
  .string()
  .refine(
    (version) =>
      z.iso.date().safeParse(version.slice(0, 10)).success &&
      version[10] === '-' &&
      z.uuid().safeParse(version.slice(11)).success,
    { message: 'version must be YYYY-MM-DD-<uuid>' },
  );

// What an Agent is, apart from where it is stored and how it is stamped.
export const agentDefinitionSchema = z.object({
  name: z.string().min(1),
  label: z.string().trim().min(1),
  model: modelIdSchema,
  prompt: z.enum(PROMPT_NAMES),
  tools: z.array(toolNameSchema),
  parameters: z.strictObject({
    temperature: z.number().min(0).max(2),
    maxTokens: z.int().positive().exactOptional(),
  }),
});

const stamp = { version: versionSchema, hash: z.string().regex(/^[0-9a-f]{64}$/) };

const agentFileSchema = z.discriminatedUnion('kind', [
  agentDefinitionSchema
    .extend({ ...stamp, kind: z.literal('agent'), name: z.enum(AGENT_NAMES) })
    .strict(),
  agentDefinitionSchema
    .extend({
      ...stamp,
      kind: z.literal('delegate'),
      name: z.enum(DELEGATE_NAMES),
      description: z.string().trim().min(1),
    })
    .strict(),
]);

type AgentFile = z.infer<typeof agentFileSchema>;
type Loaded<K extends AgentFile['kind'], N extends string> = Omit<
  Extract<AgentFile, { kind: K }>,
  'name'
> & { name: N };

export type AgentCatalog = {
  AGENTS: { [N in (typeof AGENT_NAMES)[number]]: Loaded<'agent', N> };
  DELEGATES: readonly Loaded<'delegate', (typeof DELEGATE_NAMES)[number]>[];
};

/** Validates each Agent file, keyed by its file name, and sorts them into the two registries. */
export const parseAgentCatalog = (files: Record<string, unknown>): AgentCatalog => {
  const expected = [...AGENT_NAMES, ...DELEGATE_NAMES];
  const missing = expected.filter((name) => !(name in files));
  const extra = Object.keys(files).filter((file) => !expected.some((name) => name === file));
  if (missing.length || extra.length)
    throw new Error(
      `The Agent catalog must hold exactly ${expected.join(', ')}; missing: [${missing.join(', ')}], extra: [${extra.join(', ')}]`,
    );

  const parsed = Object.entries(files).map(([file, raw]) => {
    const result = agentFileSchema.safeParse(raw);
    if (!result.success)
      throw new Error(`Invalid Agent file ${file}.json:\n${z.prettifyError(result.error)}`);
    return { file, agent: result.data };
  });

  // Files are keyed uniquely, so this also rules out two files defining one Agent.
  for (const { file, agent } of parsed)
    if (agent.name !== file)
      throw new Error(
        `Agent file ${file}.json names the Agent ${agent.name}, which does not match`,
      );

  // The file/name checks above are what make the per-name literal types true.
  const named = (name: string) => parsed.find(({ agent }) => agent.name === name)?.agent;
  return {
    AGENTS: Object.fromEntries(AGENT_NAMES.map((name) => [name, named(name)])),
    DELEGATES: DELEGATE_NAMES.map((name) => named(name)),
  } as unknown as AgentCatalog;
};

// Intake Agents run on cheap Models, the Output Agent on a mid-tier one; the Orchestrator's delegates are the only tool users.
// The hash is not checked here: the stamp script imports this module, so a stale one must still load.
export const { AGENTS, DELEGATES } = parseAgentCatalog({
  language: languageJson,
  session: sessionJson,
  orchestrator: orchestratorJson,
  output: outputJson,
  analyst: analystJson,
  critic: criticJson,
  researcher: researcherJson,
});
