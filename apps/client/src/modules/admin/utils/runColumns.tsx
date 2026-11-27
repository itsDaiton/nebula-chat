import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { AdminRunListItem } from '@/libs/api/generated/model/adminRunListItem';
import { RunSortHeader } from '@/modules/admin/components/RunSortHeader';
import { RunTokens } from '@/modules/admin/components/RunTokens';
import type { AdminTableFeatures } from '@/modules/admin/types/types';
import { RunStatusBadge } from '@/modules/inspector/components/RunStatusBadge';
import { formatDuration } from '@/modules/inspector/utils/formatDuration';
import { formatSessionDate } from '@/modules/inspector/utils/formatSessionDate';
import { resources } from '@/resources';

const { columns: text } = resources.admin.runs;
const column = createColumnHelper<AdminTableFeatures, AdminRunListItem>();
const mono = 'font-mono text-[11.5px]';
const link =
  'rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';
const NONE = '–';

// Sub-cent costs matter on a Run, so three decimals rather than the usage page's two.
const formatRunCost = (usd: number) => `$${usd.toFixed(3)}`;

export const runColumns = column.columns([
  column.accessor('status', {
    header: text.status,
    cell: (info) => <RunStatusBadge status={info.getValue()} withDot />,
  }),
  column.accessor('owner', {
    header: text.owner,
    cell: (info) => (
      <Link
        to="/admin/users"
        search={{ selected: info.getValue().id }}
        // The row opens the Run; the owner's name opens the owner.
        onClick={(event) => event.stopPropagation()}
        className={`block max-w-[120px] truncate ${link}`}
      >
        {info.getValue().name}
      </Link>
    ),
  }),
  column.accessor('session', {
    header: text.session,
    cell: (info) => (
      <Link
        to="/admin/sessions/$sessionId"
        params={{ sessionId: info.getValue().id }}
        onClick={(event) => event.stopPropagation()}
        className={`block max-w-[130px] truncate ${link}`}
      >
        {info.getValue().title}
      </Link>
    ),
  }),
  column.accessor('startedAt', {
    header: () => <RunSortHeader column="startedAt" label={text.started} />,
    cell: (info) => <span className={mono}>{formatSessionDate(info.getValue())}</span>,
  }),
  column.accessor('durationMs', {
    header: () => <RunSortHeader column="duration" label={text.duration} alignRight />,
    cell: (info) => {
      const ms = info.getValue();
      return (
        <span className={`block text-right tabular-nums ${mono}`}>
          {ms === null ? NONE : formatDuration(ms)}
        </span>
      );
    },
  }),
  column.accessor('stepCount', {
    header: () => <span className="block text-right">{text.steps}</span>,
    cell: (info) => (
      <span className={`block text-right tabular-nums ${mono}`}>{info.getValue()}</span>
    ),
  }),
  column.accessor('tokensUsed', {
    header: () => <RunSortHeader column="tokens" label={text.tokens} alignRight />,
    cell: (info) => (
      <span className={`block ${mono}`}>
        <RunTokens used={info.getValue()} budget={info.row.original.tokenBudget} />
      </span>
    ),
  }),
  column.accessor('costUsd', {
    header: () => <RunSortHeader column="cost" label={text.cost} alignRight />,
    cell: (info) => {
      const usd = info.getValue();
      return (
        <span className={`block text-right tabular-nums ${mono}`}>
          {usd === null ? NONE : formatRunCost(usd)}
        </span>
      );
    },
  }),
]);
