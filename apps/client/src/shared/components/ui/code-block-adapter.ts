import { createShikiAdapter } from '@chakra-ui/react';
import type { HighlighterGeneric } from 'shiki';
import { allowedLangs } from '@/shared/utils/allowedLangs';

let highlighterPromise: Promise<HighlighterGeneric<any, any>> | null = null;

export const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
  async load() {
    const { createHighlighter } = await import('shiki');
    highlighterPromise ??= createHighlighter({
      langs: allowedLangs,
      themes: ['github-dark', 'github-light'],
    });
    return highlighterPromise;
  },
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
});
