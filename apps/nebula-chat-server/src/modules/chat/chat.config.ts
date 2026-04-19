export const chatConfig = {
  maxHistoryMessages: 20,
  tokenLimits: {
    maxPromptTokens: 2000,
    maxCompletionTokens: 1000,
    maxContextTokens: 10000,
  },
  tokenizer: 'gpt-5',
  validModels: [
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-5.1',
    'gpt-5',
    'gpt-5-mini',
  ],
};
