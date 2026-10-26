import type { LanguageOutput } from '@worker/agents/language';
import type { SessionOutput } from '@worker/agents/session';

/** Each Intake Agent's output, keyed by its name. */
export type IntakeOutputs = { language: LanguageOutput; session: SessionOutput };

/** The JSON merge of the Intake Agents' outputs; an Agent that failed is null and named in `missing`. */
export type Brief = { [K in keyof IntakeOutputs]: IntakeOutputs[K] | null } & { missing: string[] };

export const buildBrief = (intake: Partial<IntakeOutputs>, missing: string[]): Brief => ({
  language: intake.language ?? null,
  session: intake.session ?? null,
  missing,
});
