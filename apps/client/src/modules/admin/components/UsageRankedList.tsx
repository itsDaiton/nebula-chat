import { ChevronRightIcon } from 'lucide-react';
import { UsageRankedRow } from '@/modules/admin/components/UsageRankedRow';
import type { UsageRankedListProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';

const text = resources.admin.usage;

/** Models ranked for the hovered day; the Other bucket is collapsed until opened. */
export const UsageRankedList = ({
  rows,
  dayLabel,
  highlighted,
  pinned,
  formatValue,
  onPin,
  onOpenRuns,
}: UsageRankedListProps) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <div className="flex justify-between px-2.5 pb-1 text-[12.5px] text-muted-foreground">
      <span>{dayLabel}</span>
      <span className="font-mono text-faint">{text.shareOfDay}</span>
    </div>
    {rows.map((row) =>
      row.kind === 'other' ? (
        <Collapsible key={row.key}>
          <div className="flex items-start">
            <CollapsibleTrigger
              aria-label={text.expandOther}
              className="mt-2.5 grid size-5 place-items-center rounded text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ChevronRightIcon className="size-3.5" />
            </CollapsibleTrigger>
            <div className="min-w-0 grow">
              <UsageRankedRow
                row={row}
                highlighted={false}
                pinned={false}
                formatValue={formatValue}
                onPin={onPin}
                onOpenRuns={onOpenRuns}
              />
            </div>
          </div>
          <CollapsibleContent className="pl-5">
            {row.members.map((member) => (
              <UsageRankedRow
                key={member.key}
                row={member}
                highlighted={member.key === highlighted}
                pinned={member.key === pinned}
                formatValue={formatValue}
                onPin={onPin}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <UsageRankedRow
          key={row.key}
          row={row}
          highlighted={row.key === highlighted}
          pinned={row.key === pinned}
          formatValue={formatValue}
          onPin={onPin}
          onOpenRuns={onOpenRuns}
        />
      ),
    )}
  </div>
);
