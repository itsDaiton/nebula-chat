import { useQuery } from '@tanstack/react-query';
import { FlexRender, useTable, type RowData } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { AdminDataTableProps } from '@/modules/admin/types/types';
import { adminTableFeatures } from '@/modules/admin/utils/adminTableFeatures';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/utils/cn';

const ROW_HEIGHT = 40;
const NO_ROWS: never[] = [];

/** A server-paged table: the rows come from the query the page hands in, virtualized, selectable, and paged by cursor. */
export const AdminDataTable = <TRow extends RowData, TSearch, TData>({
  columns,
  search,
  queryOptions,
  getRowId,
  selectedId,
  onSelect,
  onNext,
  canPrevious,
  onPrevious,
  label,
  empty,
  errorMessage,
}: AdminDataTableProps<TRow, TSearch, TData>) => {
  const { data, isPending, isError, refetch } = useQuery(queryOptions(search));
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = data?.rows ?? (NO_ROWS as TRow[]);

  const table = useTable({ features: adminTableFeatures, columns, data: rows, getRowId });
  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => tableRows[index]?.id ?? index,
  });
  const items = virtualizer.getVirtualItems();
  const paddingTop = items[0]?.start ?? 0;
  const paddingBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
  const columnCount = columns.length;
  const cell = 'h-10 px-3 whitespace-nowrap border-b border-border';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <table aria-label={label} className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="h-[34px] border-y border-border bg-raised px-3 text-left text-[11.5px] font-medium whitespace-nowrap text-muted-foreground first:pl-5"
                  >
                    {header.isPlaceholder ? null : <FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden>
                <td colSpan={columnCount} style={{ height: paddingTop }} />
              </tr>
            )}
            {items.map((item) => {
              const row = tableRows[item.index];
              const selected = row.id === selectedId;
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-current={selected || undefined}
                  className={cn(
                    'cursor-pointer text-foreground-secondary hover:bg-hover focus-visible:bg-hover focus-visible:outline-none',
                    selected && 'bg-hover text-foreground shadow-[inset_2px_0_0_var(--foreground)]',
                  )}
                  onClick={() => onSelect(row.original)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onSelect(row.original);
                  }}
                >
                  {row.getAllCells().map((tableCell) => (
                    <td key={tableCell.id} className={cn(cell, 'first:pl-5')}>
                      <FlexRender cell={tableCell} />
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden>
                <td colSpan={columnCount} style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
        {isPending && (
          <div role="status" aria-label={resources.admin.table.loading} className="flex flex-col">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="mx-5 my-2 h-6" />
            ))}
          </div>
        )}
        {isError && (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {resources.admin.table.retry}
            </Button>
          </div>
        )}
        {data && rows.length === 0 && <div className="px-6 py-12 text-center">{empty}</div>}
      </div>
      <nav
        aria-label={resources.admin.table.pagination}
        className="flex shrink-0 items-center justify-between px-5 py-2.5 text-xs text-muted-foreground"
      >
        <span>{data ? resources.admin.table.showing(rows.length) : null}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!canPrevious} onClick={onPrevious}>
            {resources.admin.table.previous}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.nextCursor}
            onClick={() => data?.nextCursor && onNext(data.nextCursor)}
          >
            {resources.admin.table.next}
          </Button>
        </div>
      </nav>
    </div>
  );
};
