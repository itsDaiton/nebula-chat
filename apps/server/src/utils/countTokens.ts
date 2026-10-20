import { get_encoding } from 'tiktoken';

let encoder: ReturnType<typeof get_encoding> | undefined;

/**
 * Tokens in `text` by `cl100k_base`: close enough to every supported Model's
 * tokenizer to hold a user Message to the prompt budget before it is accepted.
 */
export const countTokens = (text: string): number => {
  encoder ??= get_encoding('cl100k_base');
  return encoder.encode(text).length;
};
