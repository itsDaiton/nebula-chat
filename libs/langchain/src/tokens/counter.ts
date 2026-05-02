import { encoding_for_model, get_encoding, type TiktokenModel } from 'tiktoken';

// tiktoken model names that are valid for encoding_for_model.
// Any model not in this set falls back to cl100k_base.
const TIKTOKEN_MODELS = new Set<string>([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-3.5-turbo',
]);

export const countTokens = (text: string, model?: string): number => {
  const enc = TIKTOKEN_MODELS.has(model ?? '')
    ? encoding_for_model(model as TiktokenModel)
    : get_encoding('cl100k_base');

  const count = enc.encode(text).length;
  enc.free();
  return count;
};
