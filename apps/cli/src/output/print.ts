import { styleText } from 'node:util';

type Column = { key: string; label: string };

/** How a result reads to a human; `--json` prints the result's `data` instead. */
type View =
  | { kind: 'table'; columns: Column[]; rows: Record<string, string>[]; empty: string }
  | { kind: 'fields'; fields: [label: string, value: string][] }
  | { kind: 'message'; text: string };

export type Result = { data: unknown; view: View };

type PrintOptions = {
  json: boolean;
  color: boolean;
  write: (chunk: string) => unknown;
};

const pad = (cells: string[], widths: number[]) =>
  cells
    .map((cell, i) => cell.padEnd(widths[i] ?? 0))
    .join('  ')
    .trimEnd();

const renderTable = (
  view: Extract<View, { kind: 'table' }>,
  bold: (text: string) => string,
): string => {
  if (view.rows.length === 0) return view.empty;
  const header = view.columns.map((column) => column.label);
  const body = view.rows.map((row) => view.columns.map((column) => row[column.key] ?? ''));
  const widths = header.map((label, i) =>
    Math.max(label.length, ...body.map((cells) => cells[i]?.length ?? 0)),
  );
  return [bold(pad(header, widths)), ...body.map((cells) => pad(cells, widths))].join('\n');
};

const renderFields = (
  view: Extract<View, { kind: 'fields' }>,
  bold: (text: string) => string,
): string => {
  const width = Math.max(...view.fields.map(([label]) => label.length));
  return view.fields
    .map(([label, value]) => `${bold(`${label}:`.padEnd(width + 1))}  ${value}`)
    .join('\n');
};

export const print = ({ data, view }: Result, { json, color, write }: PrintOptions) => {
  if (json) {
    write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  // The caller decides on colour (TTY, NO_COLOR), so styleText must not second-guess the stream.
  const bold = (text: string) =>
    color ? styleText('bold', text, { validateStream: false }) : text;
  const text =
    view.kind === 'table'
      ? renderTable(view, bold)
      : view.kind === 'fields'
        ? renderFields(view, bold)
        : view.text;
  write(`${text}\n`);
};
