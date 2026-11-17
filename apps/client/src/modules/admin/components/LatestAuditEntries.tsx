import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import { getListAuditEntriesQueryOptions } from '@/libs/api/generated/admin/admin';
import { AuditActorCell } from '@/modules/admin/components/AuditActorCell';
import { resources } from '@/resources';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

const text = resources.admin.overview;
const LATEST = 5;

export const LatestAuditEntries = () => {
  const { data, isError } = useQuery(
    getListAuditEntriesQueryOptions({ limit: LATEST, order: 'desc' }),
  );
  const now = Date.now();

  return (
    <section className="pt-5.5">
      <div className="flex items-center justify-between px-5 pb-2 text-[12.5px]">
        <h2>{text.latest}</h2>
        <Link
          to="/admin/audit"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          {text.viewAll}
          <ChevronRightIcon className="size-3" />
        </Link>
      </div>
      {isError && <p className="px-5 text-sm text-muted-foreground">{text.latestFailed}</p>}
      {data && data.entries.length === 0 && (
        <p className="px-5 text-sm text-muted-foreground">{text.latestEmpty}</p>
      )}
      {data && data.entries.length > 0 && (
        <table className="w-full text-[13px]">
          <tbody>
            {data.entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border">
                <td className="w-16 px-5 py-3 font-mono text-[11.5px] text-faint">
                  {formatRelativeTime(entry.createdAt, now)}
                </td>
                <td className="px-2 py-3">
                  <AuditActorCell entry={entry} />
                </td>
                <td className="px-2 py-3 font-mono text-[11.5px]">{entry.action}</td>
                <td className="max-w-80 truncate px-2 py-3">
                  {entry.targetLabel ?? entry.targetId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
