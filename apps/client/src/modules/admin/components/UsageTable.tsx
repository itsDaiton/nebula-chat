import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import type { UsageTableProps } from '@/modules/admin/types/types';
import { dayTotals, displayValue, usageSeriesLabel } from '@/modules/admin/utils/usageData';
import { formatDay, formatSeriesValue } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';

const text = resources.admin.usage;

/** The chart's data as a table: a day per row, a Model per column. */
export const UsageTable = ({ series, metric, view }: UsageTableProps) => {
  const { getModelLabel } = useModelCatalog();
  const totals = dayTotals(series);

  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-[12.5px]">
        <caption className="sr-only">{text.tableCaption(text.metrics[metric])}</caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="sticky top-0 bg-panel px-3 py-2 font-medium">
              {text.day}
            </th>
            {series.series.map((item) => (
              <th
                key={item.key}
                scope="col"
                className="sticky top-0 bg-panel px-3 py-2 text-right font-medium"
              >
                {usageSeriesLabel(item, getModelLabel)}
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
              {series.series.map((item) => (
                <td key={item.key} className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {formatSeriesValue(metric, view, displayValue(item.values[i], totals[i], view))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
