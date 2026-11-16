import { InspectorSection } from '@/modules/inspector/components/InspectorSection';
import { RunBriefDialog } from '@/modules/inspector/components/RunBriefDialog';
import type { RunBriefProps } from '@/modules/inspector/types/types';
import { briefParts } from '@/modules/inspector/utils/briefParts';
import { resources } from '@/resources';

/** A clipped look at each Intake Agent's part of the Brief under its name; the whole Brief opens in a dialog. */
export const RunBrief = ({ brief }: RunBriefProps) => (
  <InspectorSection label={resources.inspector.run.brief}>
    <dl className="relative flex max-h-[92px] flex-col gap-2 overflow-hidden rounded-lg border border-border bg-raised px-2.5 py-2 font-mono text-[11px] leading-[1.55] after:absolute after:inset-x-0 after:bottom-0 after:h-[26px] after:bg-linear-to-b after:from-transparent after:to-raised">
      {briefParts(brief).map(({ agent, text }) => (
        <div key={agent}>
          <dt className="text-faint">{agent}</dt>
          <dd className="break-words whitespace-pre-wrap text-foreground-secondary">{text}</dd>
        </div>
      ))}
    </dl>
    <RunBriefDialog brief={brief} />
  </InspectorSection>
);
