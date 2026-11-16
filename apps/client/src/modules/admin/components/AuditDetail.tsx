import { AuditActorCell } from '@/modules/admin/components/AuditActorCell';
import type { AuditDetailProps } from '@/modules/admin/types/types';
import { formatAuditTimeFull } from '@/modules/admin/utils/formatAuditTime';
import { resources } from '@/resources';

const { detail: text } = resources.admin.audit;

/** One Audit entry in the right panel: who did what to which record, and the entry's detail JSON. */
export const AuditDetail = ({ entry }: AuditDetailProps) => {
  const facts: [string, React.ReactNode][] = [
    [text.when, formatAuditTimeFull(entry.createdAt)],
    [text.actor, <AuditActorCell key="actor" entry={entry} />],
    [text.target, `${entry.targetType} ${entry.targetId}`],
    [text.entry, entry.id],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2.5 text-[12.5px]">
        {facts.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="min-w-0 text-right font-mono break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label={text.detail}>
        <h3 className="mb-2 text-[12.5px] text-muted-foreground">{text.detail}</h3>
        <pre className="rounded-lg border border-border bg-raised p-3 font-mono text-[11.5px] leading-relaxed break-words whitespace-pre-wrap">
          {Object.keys(entry.detail).length > 0 ? JSON.stringify(entry.detail, null, 2) : text.none}
        </pre>
      </section>
    </div>
  );
};
