import type { LanguageDetection } from '@worker/agents/languageDetection';
import type { SessionSummary } from '@worker/agents/sessionSummary';

/** The structured merge of the Intake Agents' outputs; a part whose Agent failed is null and named in `missing`. */
export type Brief = {
  language: string | null;
  englishRestatement: string | null;
  sessionSummary: string | null;
  missing: string[];
};

export const buildBrief = (
  detected: LanguageDetection | null,
  summary: SessionSummary | null,
  missing: string[],
): Brief => ({
  language: detected?.language ?? null,
  englishRestatement: detected?.englishRestatement ?? null,
  sessionSummary: summary?.summary ?? null,
  missing,
});
