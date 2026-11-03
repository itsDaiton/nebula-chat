import type { createHighlighter } from 'shiki';
import { allowedLangs } from '@/shared/utils/allowedLangs';

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

const THEME = 'css-variables';

let highlighterPromise: Promise<Highlighter> | null = null;

// Shiki loads on first use; its colours are CSS variables, so one theme serves light and dark.
const getHighlighter = () => {
  highlighterPromise ??= import('shiki').then(({ createCssVariablesTheme, createHighlighter }) =>
    createHighlighter({
      langs: allowedLangs,
      themes: [createCssVariablesTheme({ name: THEME, variablePrefix: '--shiki-' })],
    }),
  );
  return highlighterPromise;
};

/** The highlighted HTML for `code`; a language outside the allow-list renders as plain text. */
export const highlightCode = async (code: string, language: string): Promise<string> => {
  const highlighter = await getHighlighter();
  const lang = highlighter.getLoadedLanguages().includes(language) ? language : 'text';
  return highlighter.codeToHtml(code, { lang, theme: THEME });
};
