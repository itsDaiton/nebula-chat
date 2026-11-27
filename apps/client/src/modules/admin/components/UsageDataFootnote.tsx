import { InfoIcon } from 'lucide-react';
import type { UsageDataFootnoteProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const text = resources.admin.usage;

export const UsageDataFootnote = ({ note, asTable, onToggle }: UsageDataFootnoteProps) => (
  <div className="flex items-start gap-2 px-5 py-3 text-[12.5px] text-muted-foreground">
    <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
    <p className="m-0">
      {note}{' '}
      <button
        type="button"
        aria-pressed={asTable}
        className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none"
        onClick={onToggle}
      >
        {asTable ? text.viewAsChart : text.viewAsTable}
      </button>
    </p>
  </div>
);
