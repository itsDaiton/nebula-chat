import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';
import type { ColumnDef, RowData } from '@tanstack/react-table';
import type { adminTableFeatures } from '@/modules/admin/utils/adminTableFeatures';
import type { AuditEntry } from '@/libs/api/generated/model/auditEntry';
import type { AuditEntryActorType } from '@/libs/api/generated/model/auditEntryActorType';
import type { ErrorEnvelope } from '@/libs/api/generated/model/errorEnvelope';
import type { ErrorType } from '@/libs/api/client';

export type AdminTableFeatures = typeof adminTableFeatures;

/** What the Audit log's URL holds: its filters and the page cursor. */
export type AuditSearch = {
  actor?: AuditEntryActorType;
  action?: AuditEntry['action'];
  target?: string;
  /** A day, `YYYY-MM-DD`, read as UTC. */
  from?: string;
  to?: string;
  cursor?: string;
};

/** One server page of an admin table: its rows and where the next one starts. */
export type AdminPage<TRow> = { rows: TRow[]; nextCursor: string | null };

type AdminNavPage = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Unset while the page is not built: its row is disabled and labelled "soon". */
  to?: '/admin/audit';
  /** The page has selectable rows, so the right panel and its toggle exist. */
  hasDetail?: boolean;
};

export type AdminNavGroup = { label?: string; pages: AdminNavPage[] };

export type AdminNavProps = { onNavigate?: () => void };

export type AdminNavItemProps = { page: AdminNavPage; onNavigate?: () => void };

/** The row an admin table's right panel shows, and the route it belongs to. */
type AdminSelection = { path: string; id: string; title: string; detail: ReactNode };

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
