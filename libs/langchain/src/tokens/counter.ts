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

const encoderCache = new Map<string, ReturnType<typeof get_encoding>>();

const getEncoder = (model?: string) => {
  const cacheKey = model && TIKTOKEN_MODELS.has(model) ? model : 'cl100k_base';
  const cached = encoderCache.get(cacheKey);
  if (cached) return cached;

  let encoder;
  if (cacheKey === 'cl100k_base') {
    encoder = get_encoding('cl100k_base');
  } else {
    try {
      encoder = encoding_for_model(cacheKey as TiktokenModel);
    } catch {
      encoder = get_encoding('cl100k_base');
    }
  }

  encoderCache.set(cacheKey, encoder);
  return encoder;
};

export const countTokens = (text: string, model?: string): number =>
  getEncoder(model).encode(text).length;
