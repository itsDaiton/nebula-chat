import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// One static Markdown file per name; dynamic content belongs in the human message, never here.
const PROMPT_NAMES = ['directReply', 'language', 'session', 'output'] as const;

export type PromptName = (typeof PROMPT_NAMES)[number];

export type Prompts = Readonly<Record<PromptName, string>>;

// Relative to this module, so it resolves from `src/` (dev, tests) and `dist/src/` (the build copies it).
const PROMPTS_DIR = resolve(__dirname, '../resources/prompts');

export const loadPrompts = (dir: string = PROMPTS_DIR): Prompts =>
  Object.freeze(
    Object.fromEntries(
      PROMPT_NAMES.map((name) => {
        const file = join(dir, `${name}.md`);
        try {
          return [name, readFileSync(file, 'utf8')];
        } catch (err) {
          throw new Error(`Missing system prompt: ${file}`, { cause: err });
        }
      }),
    ) as Record<PromptName, string>,
  );
