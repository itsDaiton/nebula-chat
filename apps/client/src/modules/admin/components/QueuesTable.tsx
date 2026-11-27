import type { QueuesTableProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const text = resources.admin.operations.queues;
const head = 'border-y border-border bg-raised px-4 py-2 font-normal';
const counts = ['waiting', 'active', 'delayed', 'failed'] as const;

export const QueuesTable = ({ queues }: QueuesTableProps) => (
  <section aria-labelledby="queues-title" className="flex flex-col">
    <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-5 pt-5 pb-2 text-[12.5px]">
      <h2 id="queues-title" className="font-medium">
        {text.title}
      </h2>
      <span className="grow" />
      <span className="text-foreground-secondary">{text.note}</span>
    </div>
    <div className="overflow-x-auto">
      <table
        aria-label={text.title}
        className="w-full border-collapse text-[13px] whitespace-nowrap"
      >
        <thead className="text-[12.5px] text-muted-foreground">
          <tr>
            <th scope="col" className={`${head} text-left`}>
              {text.columns.queue}
            </th>
            {counts.map((count) => (
              <th key={count} scope="col" className={`${head} text-right`}>
                {text.columns[count]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {queues.map((queue) => (
            <tr key={queue.name} className="border-b border-border">
              <td className="px-4 py-3">{queue.name}</td>
              {counts.map((count) => (
                <td key={count} className="px-4 py-3 text-right tabular-nums">
                  {queue[count]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
