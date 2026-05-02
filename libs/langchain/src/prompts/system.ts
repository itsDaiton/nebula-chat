export const SYSTEM_PROMPTS = {
  default: 'You are a helpful assistant. Answer concisely and accurately.',
  coding: 'You are an expert software engineer. Provide working code with brief explanations.',
  creative: 'You are a creative writing assistant. Be imaginative and engaging.',
} as const;

export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS;
