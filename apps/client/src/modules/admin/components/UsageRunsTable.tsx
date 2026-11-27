import type { UsageRunsTableProps } from '@/modules/admin/types/types';
import { formatCount, formatDay } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';

const text = resources.admin.usage;

/** The chart's data as a table: a day per row, an outcome per column. */
export const UsageRunsTable = ({ series }: UsageRunsTableProps) => (
  <div className="max-h-96 overflow-auto rounded-xl border border-border">
    <table className="w-full border-collapse text-[12.5px]">
      <caption className="sr-only">{text.runs.tableCaption}</caption>
      <thead>
        <tr className="text-left text-muted-foreground">
          <th scope="col" className="sticky top-0 bg-panel px-3 py-2 font-medium">
            {text.day}
          </th>
          {series.outcomes.map(({ outcome }) => (
            <th
              key={outcome}
              scope="col"
              className="sticky top-0 bg-panel px-3 py-2 text-right font-medium"
            >
              {text.runs.outcomes[outcome]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {series.days.map((day, i) => (
          <tr key={day} className="border-t border-border">
            <th scope="row" className="px-3 py-1.5 text-left font-normal">
              {formatDay(day)}
            </th>
            {series.outcomes.map(({ outcome, values }) => (
              <td key={outcome} className="px-3 py-1.5 text-right font-mono tabular-nums">
                {formatCount(values[i] ?? 0)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
