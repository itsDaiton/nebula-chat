import { InfoIcon } from 'lucide-react';
import { LogLevelTableRow } from '@/modules/admin/components/LogLevelTableRow';
import { useLogLevelFormStore } from '@/modules/admin/stores/useLogLevelFormStore';
import type { LogLevelsTableProps } from '@/modules/admin/types/types';
import { logLevelRows } from '@/modules/admin/utils/logLevels';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';

const text = resources.admin.operations;
const head = 'border-y border-border bg-raised px-4 py-2 text-left font-normal';

/** Each service's root level and temporary changes; the row the panel is set to is marked. */
export const LogLevelsTable = ({ services }: LogLevelsTableProps) => {
  const selectedService = useLogLevelFormStore((state) => state.service);
  const selectedTarget = useLogLevelFormStore((state) => state.target);
  const isPending = services.some((entry) => entry.isPending);
  const isError = services.some((entry) => entry.isError);

  return (
    <section aria-labelledby="log-levels-title" className="flex flex-col">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-5 pt-5 pb-2 text-[12.5px]">
        <h2 id="log-levels-title" className="font-medium">
          {text.logLevels.title}
        </h2>
        <span className="grow" />
        <span className="flex items-center gap-1.5 text-foreground-secondary">
          <InfoIcon className="size-3" />
          {text.logLevels.note}
        </span>
      </div>
      {!isPending && (
        <p className="m-0 flex gap-4 px-5 pb-2 font-mono text-[11.5px] text-muted-foreground">
          {services.map(({ service, reports }) => (
            <span key={service}>
              {text.logLevels.instances(
                text.services[service],
                reports?.reports.length ?? 0,
                reports?.receivers ?? 0,
              )}
            </span>
          ))}
        </p>
      )}
      {isError && (
        <p className="px-5 pb-2 text-sm text-muted-foreground">{text.logLevels.loadFailed}</p>
      )}
      {isPending ? (
        <output aria-label={text.logLevels.loading} className="flex flex-col gap-2 px-5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-9" />
          ))}
        </output>
      ) : (
        <table aria-label={text.logLevels.title} className="w-full border-collapse text-[13px]">
          <thead className="text-[12.5px] text-muted-foreground">
            <tr>
              <th scope="col" className={head}>
                {text.logLevels.columns.service}
              </th>
              <th scope="col" className={head}>
                {text.logLevels.columns.target}
              </th>
              <th scope="col" className={head}>
                {text.logLevels.columns.level}
              </th>
              <th scope="col" className={head}>
                {text.logLevels.columns.reverts}
              </th>
              <th scope="col" className={head}>
                {text.logLevels.columns.setBy}
              </th>
              <th scope="col" className={head}>
                <span className="sr-only">{text.logLevels.revert}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map(({ service, reports }) => {
              const rows = logLevelRows(service, reports);
              if (rows.length === 0) {
                return (
                  <tr key={service} className="border-b border-border">
                    <td className="px-4 py-3">{text.services[service]}</td>
                    <td colSpan={5} className="px-4 py-3 text-muted-foreground">
                      {text.logLevels.noInstance}
                    </td>
                  </tr>
                );
              }
              return rows.map((row) => (
                <LogLevelTableRow
                  key={[service, row.target, row.level, row.expiresAt, row.operator].join('|')}
                  row={row}
                  selected={service === selectedService && row.target === selectedTarget}
                />
              ));
            })}
          </tbody>
        </table>
      )}
    </section>
  );
};
