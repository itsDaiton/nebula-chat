import type { z } from 'zod';
import type { banSchema } from '@/modules/admin/utils/banSchema';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';
import type { ColumnDef, RowData } from '@tanstack/react-table';
import type { adminTableFeatures } from '@/modules/admin/utils/adminTableFeatures';
import type { ModelProvider } from '@/shared/types/types';
import type { UsageSeries } from '@/libs/api/generated/model/usageSeries';
import type { UsageSeriesSeriesItem } from '@/libs/api/generated/model/usageSeriesSeriesItem';
import type { UsageTotals } from '@/libs/api/generated/model/usageTotals';
import type { UsageDetail } from '@/libs/api/generated/model/usageDetail';
import type { GetModelUsageSeriesAudience } from '@/libs/api/generated/model/getModelUsageSeriesAudience';
import type { GetModelUsageSeriesMetric } from '@/libs/api/generated/model/getModelUsageSeriesMetric';
import type { GetModelUsageSeriesRange } from '@/libs/api/generated/model/getModelUsageSeriesRange';
import type { AdminOverview } from '@/libs/api/generated/model/adminOverview';
import type { AuditEntry } from '@/libs/api/generated/model/auditEntry';
import type { ListAuditEntriesActorType } from '@/libs/api/generated/model/listAuditEntriesActorType';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import type { AdminUserSummaryStatus } from '@/libs/api/generated/model/adminUserSummaryStatus';
import type { ErrorEnvelope } from '@/libs/api/generated/model/errorEnvelope';
import type { ListAllSessionsArchived } from '@/libs/api/generated/model/listAllSessionsArchived';
import type { ListAuditEntriesOrder } from '@/libs/api/generated/model/listAuditEntriesOrder';
import type { ListAllSessionsOrder } from '@/libs/api/generated/model/listAllSessionsOrder';
import type { GetAdminOverviewRange } from '@/libs/api/generated/model/getAdminOverviewRange';
import type { ListUsersOrder } from '@/libs/api/generated/model/listUsersOrder';
import type { ListUsersSortBy } from '@/libs/api/generated/model/listUsersSortBy';
import type { ListUsersStatusItem } from '@/libs/api/generated/model/listUsersStatusItem';
import type { ErrorType } from '@/libs/api/client';

export type AdminTableFeatures = typeof adminTableFeatures;

/** What the Audit log's URL holds: its filters and the page cursor. */
export type AuditSearch = {
  actor?: ListAuditEntriesActorType;
  action?: AuditEntry['action'];
  target?: string;
  /** A day, `YYYY-MM-DD`, read as UTC. */
  from?: string;
  to?: string;
  dir?: ListAuditEntriesOrder;
  cursor?: string;
};

/** One server page of an admin table: its rows and where the next one starts. */
export type AdminPage<TRow> = { rows: TRow[]; nextCursor: string | null; total?: number };

type AdminNavPage = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Unset while the page is not built: its row is disabled and labelled "soon". */
  to?: '/admin' | '/admin/audit' | '/admin/sessions' | '/admin/usage' | '/admin/users';
  /** The page has selectable rows, so the right panel and its toggle exist. */
  hasDetail?: boolean;
};

export type AdminNavGroup = { label?: string; pages: AdminNavPage[] };

export type AdminNavProps = { onNavigate?: () => void };

export type AdminNavItemProps = { page: AdminNavPage; onNavigate?: () => void };

/** The row an admin table's right panel shows, and the route it belongs to. */
type AdminSelection = { path: string; id: string; title: string; detail: ReactNode };

export type AdminPageTitleProps = { children: ReactNode };
export type AdminDetailPanelProps = { path: string; onClose: () => void };

export type AdminDetailState = {
  selection: AdminSelection | null;
  select: (selection: AdminSelection) => void;
  clear: () => void;
};

export type AdminDataTableProps<TRow extends RowData, TSearch, TData> = {
  columns: ColumnDef<AdminTableFeatures, TRow, any>[];
  search: TSearch;
  queryOptions: (
    search: TSearch,
  ) => UseQueryOptions<TData, ErrorType<ErrorEnvelope>, AdminPage<TRow>, QueryKey>;
  getRowId: (row: TRow) => string;
  selectedId?: string;
  onSelect: (row: TRow) => void;
  /** Moves to the page after this one. */
  onNext: (cursor: string) => void;
  /** Whether a page came before this one. */
  canPrevious: boolean;
  onPrevious: () => void;
  label: string;
  empty: ReactNode;
  errorMessage: string;
};

export type AuditActorCellProps = { entry: AuditEntry };

export type AuditDetailProps = { entry: AuditEntry };

type AuditFilterChange = (patch: Partial<AuditSearch>) => void;

export type AuditFiltersProps = { search: AuditSearch; onChange: AuditFilterChange };

export type AuditFilterChipProps = {
  children: ReactNode;
  /** A filter that holds a value is filled; one that doesn't is a quiet dashed chip. */
  active: boolean;
  dashed?: boolean;
  /** Names the × that clears the filter; without it the chip has none. */
  clearLabel?: string;
  onClear?: () => void;
};

export type AuditChoiceFilterProps = {
  icon: LucideIcon;
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
};

export type AuditTargetFilterProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

export type AuditDateFilterProps = {
  from: string | undefined;
  to: string | undefined;
  onChange: AuditFilterChange;
};

/** What the Users page's URL holds: search, filters, sort, the page cursor and the open User. */
export type UsersSearch = {
  q?: string;
  status?: ListUsersStatusItem[];
  sort?: ListUsersSortBy;
  dir?: ListUsersOrder;
  cursor?: string;
  selected?: string;
};

export type UserFiltersProps = {
  search: UsersSearch;
  /** `replace` keeps typing in the search box out of the history. */
  onChange: (patch: Partial<UsersSearch>, replace?: boolean) => void;
};

/** One toggle in the Users toolbar; a dashed one is an opt-in rather than a status. */
export type UserStatusChip = { status: ListUsersStatusItem; label: string; dashed?: boolean };

export type UserSearchInputProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** The box's accessible name and placeholder; the Users page's by default. */
  label?: string;
  placeholder?: string;
};

export type UserSortHeaderProps = { column: ListUsersSortBy; label: string; alignRight?: boolean };

export type UserStatusBadgeProps = { status: AdminUserSummaryStatus };

export type UserLastActiveProps = { at: string; long?: boolean };

export type UserDetailPanelProps = { onClose: () => void };

export type UserDetailProps = { user: AdminUserDetail };

export type UserBanNoticeProps = { ban: NonNullable<AdminUserDetail['ban']> };

export type UserSessionsListProps = { userId: string };

/** What the Sessions table's URL holds, and what the open transcript carries so going back keeps it. */
export type SessionsSearch = {
  q?: string;
  /** The owner's id. */
  user?: string;
  model?: string;
  archived?: ListAllSessionsArchived;
  dir?: ListAllSessionsOrder;
  cursor?: string;
};

export type SessionFiltersProps = {
  search: SessionsSearch;
  /** `replace` keeps typing in the search box out of the history. */
  onChange: (patch: Partial<SessionsSearch>, replace?: boolean) => void;
};

export type SessionOwnerFilterProps = { userId: string; onClear: () => void };

export type SessionMetaPanelProps = { onClose: () => void };

type UserActionRule = { disabledReason?: string };

export type UserActionRules = {
  role: UserActionRule;
  ban: UserActionRule;
  restore: UserActionRule;
};

export type UserActionContext = { lastAdmin: boolean; self: boolean };

export type UserActionsProps = { user: AdminUserDetail };

export type UserActionButtonProps = {
  label: string;
  icon: ReactNode;
  disabledReason?: string;
  onClick: () => void;
};

export type UserConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
};

export type BanDialogProps = {
  user: AdminUserDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type BanValues = z.infer<typeof banSchema>;

type UserActionDialog = 'role' | 'ban' | 'unban' | 'restore';

export type UserActionState = {
  open: UserActionDialog | null;
  show: (dialog: UserActionDialog) => void;
  close: () => void;
};

export type OverviewDelta = { direction: 'up' | 'down' | 'flat'; text: string };

export type OverviewTileData = {
  id: keyof AdminOverview['kpis'];
  value: string;
  delta: OverviewDelta | null;
  series: number[];
};

export type OverviewTileProps = {
  label: string;
  range: GetAdminOverviewRange;
  value: string;
  delta: OverviewDelta | null;
  series: number[];
};

export type OverviewRangeSwitchProps = {
  value: GetAdminOverviewRange;
  onChange: (range: GetAdminOverviewRange) => void;
};

export type UsageView = 'share' | 'volume';

/** What the Model usage page's URL holds; every field falls back to a default. */
export type UsageSearch = {
  metric?: GetModelUsageSeriesMetric;
  range?: GetModelUsageSeriesRange;
  view?: UsageView;
  models?: string[];
  audience?: GetModelUsageSeriesAudience;
  pinned?: string;
};

export type UsageParams = {
  metric: GetModelUsageSeriesMetric;
  range: GetModelUsageSeriesRange;
  view: UsageView;
  models: string[] | undefined;
  audience: GetModelUsageSeriesAudience;
  pinned: string | undefined;
};

export type UsageTotalsParams = Pick<UsageParams, 'range' | 'audience'>;

type UsageSegmentOption<T extends string> = { value: T; label: string };

export type UsageSegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: UsageSegmentOption<T>[];
  onChange: (value: T) => void;
};

export type UsageToolbarProps = { params: UsageParams; onChange: (search: UsageSearch) => void };

export type UsageModelFilterProps = {
  selected: string[] | undefined;
  hasRun: boolean;
  onChange: (models: string[] | undefined) => void;
};

export type UsageTileData = {
  id: 'prompts' | 'tokens' | 'spend' | 'activeUsers' | 'runs' | 'cacheHitRate';
  value: string;
  delta: OverviewDelta | null;
};

export type UsageTilesProps = { totals: UsageTotals | undefined };

export type UsageRankRow = {
  key: string;
  label: string;
  provider: ModelProvider | null;
  kind: UsageSeriesSeriesItem['kind'];
  value: number;
  share: number;
  members: UsageRankRow[];
};

export type UsageChartCardProps = {
  params: UsageParams;
  series: UsageSeries;
  hoverIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
  onPin: (key: string) => void;
  highlighted: string | null;
};

export type UsageRankedListProps = {
  rows: UsageRankRow[];
  dayLabel: string;
  highlighted: string | null;
  pinned: string | undefined;
  formatValue: (value: number) => string;
  onPin: (key: string) => void;
};

export type UsageRankedRowProps = {
  row: UsageRankRow;
  highlighted: boolean;
  pinned: boolean;
  formatValue: (value: number) => string;
  onPin: (key: string) => void;
};

export type UsageTableProps = {
  series: UsageSeries;
  metric: GetModelUsageSeriesMetric;
  view: UsageView;
};

export type UsageDetailBodyProps = { detail: UsageDetail };

export type UsageHoverState = { day: string | null; setDay: (day: string | null) => void };

export type UsageTableState = { asTable: boolean; toggle: () => void };

export type UsageDetailPanelProps = { onClose: () => void };

export type UsageDetailRowProps = { label: string; value: string };
