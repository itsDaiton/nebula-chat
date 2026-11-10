import { InspectorSection } from '@/modules/inspector/components/InspectorSection';
import type { RunBriefProps } from '@/modules/inspector/types/types';
import { formatBriefPart } from '@/modules/inspector/utils/formatBriefPart';
import { resources } from '@/resources';

const { run: text } = resources.inspector;

/** Each Intake Agent's part of the Brief under its name; `missing` is told by the end notice instead. */
export const RunBrief = ({ brief }: RunBriefProps) => (
  <InspectorSection label={text.brief}>
    <dl className="flex max-h-[92px] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-raised px-2.5 py-2 font-mono text-[11px] leading-[1.55]">
      {Object.entries(brief)
        .filter(([agent]) => agent !== 'missing')
        .map(([agent, part]) => (
          <div key={agent}>
            <dt className="text-faint">{agent}</dt>
            <dd className="break-words whitespace-pre-wrap text-foreground-secondary">
              {part === null ? text.briefMissing : formatBriefPart(part)}
            </dd>
          </div>
        ))}
    </dl>
  </InspectorSection>
);
