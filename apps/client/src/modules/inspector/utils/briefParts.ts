import type { Run } from '@/libs/api/generated/model/run';
import type { BriefPart } from '@/modules/inspector/types/types';
import { formatBriefPart } from '@/modules/inspector/utils/formatBriefPart';
import { resources } from '@/resources';

/** Each Intake Agent's part of the Brief as text, by Agent; `missing` is told by the end notice instead. */
export const briefParts = (brief: NonNullable<Run['brief']>): BriefPart[] =>
  Object.entries(brief)
    .filter(([agent]) => agent !== 'missing')
    .map(([agent, part]) => ({
      agent,
      text: part === null ? resources.inspector.run.briefMissing : formatBriefPart(part),
    }));
