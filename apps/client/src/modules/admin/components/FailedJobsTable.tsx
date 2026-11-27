import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, WorkflowIcon } from 'lucide-react';
import type { FailedJobsTableProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const text = resources.admin.operations.failedJobs;
const failedAt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// `27 Oct 19:04`, in the viewer's time zone.
const formatFailedAt = (iso: string) => failedAt.format(new Date(iso)).replace(',', '');

const head = 'border-y border-border bg-raised px-4 py-2 text-left font-normal';

export const FailedJobsTable = ({ jobs }: FailedJobsTableProps) => (
  <section aria-labelledby="failed-jobs-title" className="flex flex-col pb-5">
    <h2 id="failed-jobs-title" className="px-5 pt-5 pb-2 text-[12.5px] font-medium">
      {text.title}
    </h2>
    {jobs.length === 0 ? (
      <p className="px-5 text-sm text-muted-foreground">{text.empty}</p>
    ) : (
      <div className="overflow-x-auto">
        <table aria-label={text.title} className="w-full border-collapse text-[13px]">
          <thead className="text-[12.5px] whitespace-nowrap text-muted-foreground">
            <tr>
              <th scope="col" className={head}>
                {text.columns.failed}
              </th>
              <th scope="col" className={head}>
                {text.columns.queue}
              </th>
              <th scope="col" className={`${head} text-right`}>
                {text.columns.attempts}
              </th>
              <th scope="col" className={head}>
                {text.columns.error}
              </th>
              <th scope="col" className={head}>
                {text.columns.run}
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={`${job.queue}|${job.id}`} className="border-b border-border">
                <td className="px-4 py-3 font-mono whitespace-nowrap">
                  {formatFailedAt(job.failedAt)}
                </td>
                <td className="px-4 py-3 font-mono whitespace-nowrap">{job.queue}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{job.attemptsMade}</td>
                {/* max-w-0 makes the cell take the leftover width and truncate; min-w keeps it readable on a phone. */}
                <td className="w-full max-w-0 min-w-48 truncate px-4 py-3" title={job.error}>
                  {job.error}
                </td>
                <td className="px-4 py-3 font-mono whitespace-nowrap">
                  {job.runId === null ? (
                    <span className="text-faint">{text.noRun}</span>
                  ) : (
                    <Link
                      to="/admin/runs"
                      search={{ selected: job.runId }}
                      aria-label={text.openRun}
                      title={job.runId}
                      className="inline-flex items-center gap-1 text-foreground-secondary hover:text-foreground"
                    >
                      <WorkflowIcon className="size-3.5" />
                      {text.runLabel(job.runId)}
                      <ChevronRightIcon className="size-3 text-faint" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
