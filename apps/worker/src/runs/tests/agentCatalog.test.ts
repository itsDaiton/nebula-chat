import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getModel, RUN_PROVIDERS } from '@nebula-chat/contracts';
import { loadPrompts } from '@worker/llm/prompts';
import { AGENTS, DELEGATES, parseAgentCatalog } from '@worker/runs/agentCatalog';
import { agentHash } from '@worker/runs/agentHash';

const AGENT_DIR = resolve(__dirname, '../../agents');
const FILES = ['language', 'session', 'orchestrator', 'output', 'analyst', 'critic', 'researcher'];

const prompts = loadPrompts();

const shippedFiles = (): Record<string, any> =>
  Object.fromEntries(
    FILES.map((file) => [
      file,
      JSON.parse(readFileSync(resolve(AGENT_DIR, `${file}.json`), 'utf8')),
    ]),
  );

const rejects = (edit: (files: Record<string, any>) => void) => {
  const files = shippedFiles();
  edit(files);

  return expect(() => parseAgentCatalog(files));
};

describe('the shipped Agent catalog', () => {
  it('holds the four top-level Agents, keyed by name', () => {
    expect(Object.keys(AGENTS)).toEqual(['language', 'session', 'orchestrator', 'output']);
    expect(Object.entries(AGENTS).every(([key, agent]) => agent.name === key)).toBe(true);
  });

  it('holds the three delegates in the order the Orchestrator lists them', () => {
    expect(DELEGATES.map(({ name }) => name)).toEqual(['analyst', 'critic', 'researcher']);
    expect(DELEGATES.every((delegate) => delegate.description.length > 0)).toBe(true);
  });

  it('gives only the researcher the web', () => {
    const granted = DELEGATES.map(({ name, tools }) => [name, tools]);

    expect(granted).toEqual([
      ['analyst', []],
      ['critic', []],
      ['researcher', ['web_search', 'web_fetch']],
    ]);
  });

  it('keeps each Agent on the Model and parameters it has always run with', () => {
    expect(AGENTS.language).toMatchObject({ model: 'gpt-4o-mini', parameters: { temperature: 0 } });
    expect(AGENTS.output).toMatchObject({ model: 'gpt-4.1', parameters: { temperature: 0.7 } });
    expect(DELEGATES[0]).toMatchObject({ model: 'gpt-4.1-mini', parameters: { temperature: 0.3 } });
  });

  it('lists exactly the providers the Run Agents call', () => {
    const used = [...Object.values(AGENTS), ...DELEGATES].map(
      ({ model }) => getModel(model).provider,
    );

    expect([...new Set(used)].sort()).toEqual([...RUN_PROVIDERS].sort());
  });
});

const definitionOf = (file: string) => {
  const { version, hash, ...definition } = shippedFiles()[file];

  return { version, hash, definition };
};

describe('the stamp of each Agent file', () => {
  it.each(FILES)(
    'records a hash of %s and its prompt, so an edit without a re-stamp fails here',
    (file) => {
      const { version, hash, definition } = definitionOf(file);

      expect(version).toMatch(/^\d{4}-\d{2}-\d{2}-[0-9a-f-]{36}$/);
      expect(agentHash(definition, prompts[definition.prompt as keyof typeof prompts])).toBe(hash);
    },
  );
});

describe('parseAgentCatalog', () => {
  it('accepts the shipped files', () => {
    expect(() => parseAgentCatalog(shippedFiles())).not.toThrow();
  });

  it('rejects a Model that is not in the catalog', () => {
    rejects((files) => (files.analyst.model = 'gpt-nope')).toThrow(/analyst\.json/);
  });

  it('rejects a tool that does not exist', () => {
    rejects((files) => (files.researcher.tools = ['web_search', 'web_browse'])).toThrow(
      /researcher\.json/,
    );
  });

  it('rejects a prompt that does not exist', () => {
    rejects((files) => (files.critic.prompt = 'nobody')).toThrow(/critic\.json/);
  });

  it('rejects a name that does not match its file', () => {
    rejects((files) => (files.critic.name = 'analyst')).toThrow(/does not match/);
  });

  it('rejects a name used by two files', () => {
    rejects((files) => (files.critic = structuredClone(files.analyst))).toThrow(/does not match/);
  });

  it('rejects a missing Agent', () => {
    rejects((files) => delete files.session).toThrow(/session/);
  });

  it('rejects an extra Agent', () => {
    rejects((files) => (files.translator = { ...files.analyst, name: 'translator' })).toThrow(
      /translator/,
    );
  });

  it('rejects a delegate without a description', () => {
    rejects((files) => delete files.researcher.description).toThrow(/researcher\.json/);
  });

  it('rejects a kind that does not suit the name', () => {
    rejects((files) => (files.language.kind = 'delegate')).toThrow(/language\.json/);
  });

  it('rejects a field the schema does not know', () => {
    rejects((files) => (files.output.temperature = 1)).toThrow(/output\.json/);
  });

  it.each([
    ['a negative temperature', { temperature: -0.1 }],
    ['a temperature above 2', { temperature: 2.1 }],
    ['a zero maxTokens', { temperature: 0, maxTokens: 0 }],
    ['a fractional maxTokens', { temperature: 0, maxTokens: 1.5 }],
  ])('rejects %s', (_case, parameters) => {
    rejects((files) => (files.analyst.parameters = parameters)).toThrow(/analyst\.json/);
  });

  it('accepts a maxTokens within range', () => {
    const files = shippedFiles();
    files.analyst.parameters = { temperature: 0.3, maxTokens: 512 };

    expect(parseAgentCatalog(files).DELEGATES[0]?.parameters).toEqual({
      temperature: 0.3,
      maxTokens: 512,
    });
  });
});
