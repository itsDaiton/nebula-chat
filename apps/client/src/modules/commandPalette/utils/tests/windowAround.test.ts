import { describe, expect, it } from 'vitest';
import { windowAround } from '@/modules/commandPalette/utils/windowAround';

const text =
  'a film about a long escape from prison, told through the eyes of the prisoners themselves';

describe('windowAround', () => {
  it('keeps the first match in view with ellipses where it cuts', () => {
    const result = windowAround(text, 'PRISON', 10, 10);

    expect(result).toBe('…cape from prison, told thr…');
  });

  it('adds no ellipsis at an edge the text already reaches', () => {
    expect(windowAround('prison break', 'prison', 10, 10)).toBe('prison break');
  });

  it('returns the text untouched without a query or a match', () => {
    expect(windowAround(text, '')).toBe(text);
    expect(windowAround(text, 'zebra')).toBe(text);
  });
});
