import { z } from 'zod';

export const languageSchema = z.object({
  language: z.string().min(1).describe('The language the message is written in, by English name'),
  englishRestatement: z.string().min(1).describe('The message restated faithfully in English'),
});

export type LanguageOutput = z.infer<typeof languageSchema>;
