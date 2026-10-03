import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { operatorTokenSchema } from '@backend/utils/operatorToken';

const token = 'a'.repeat(32);

describe('operatorTokenSchema', () => {
  it('accepts a token of 32 or more characters', () => {
    expect(operatorTokenSchema.parse(token)).toBe(token);
  });

  it('rejects a token shorter than 32 characters', () => {
    expect(operatorTokenSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('reads an empty value as unset, so a copied .env.example boots', () => {
    expect(operatorTokenSchema.parse('')).toBeUndefined();
  });

  it('stays unset when the variable is absent from an object schema', () => {
    const envSchema = z.object({ OPERATOR_TOKEN: operatorTokenSchema });
    expect(envSchema.parse({}).OPERATOR_TOKEN).toBeUndefined();
    expect(envSchema.parse({ OPERATOR_TOKEN: '' }).OPERATOR_TOKEN).toBeUndefined();
  });
});
