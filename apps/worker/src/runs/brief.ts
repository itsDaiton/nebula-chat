import type { LanguageOutput } from '@worker/agentIo/language';
import type { SessionOutput } from '@worker/agentIo/session';

/** Each Intake Agent's output, keyed by its name. */
export type IntakeOutputs = { language: LanguageOutput; session: SessionOutput };

/** The JSON merge of the Intake Agents' outputs; an Agent that failed is null and named in `missing`, one that had nothing to do in `skipped`. */
export type Brief = { [K in keyof IntakeOutputs]: IntakeOutputs[K] | null } & {
  missing: string[];
  skipped: string[];
};

export const buildBrief = (
  intake: Partial<IntakeOutputs>,
  missing: string[],
  skipped: string[],
): Brief => ({
  language: intake.language ?? null,
  session: intake.session ?? null,
  missing,
  skipped,
});
