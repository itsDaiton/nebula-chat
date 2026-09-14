import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate } from '@/shared/utils/dateUtils';

const NOW = new Date('2026-06-15T12:00:00.000Z');

/** An ISO timestamp the given number of milliseconds before NOW. */
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDate', () => {
  it('describes anything under a minute as less than a minute', () => {
    expect(formatDate(ago(30_000))).toBe('less than a minute ago');
  });

  it('uses the singular for exactly one minute', () => {
    expect(formatDate(ago(MINUTE))).toBe('1 minute ago');
  });

  it('pluralises minutes', () => {
    expect(formatDate(ago(5 * MINUTE))).toBe('5 minutes ago');
  });

  it('switches to hours at the 60-minute boundary', () => {
    expect(formatDate(ago(59 * MINUTE))).toBe('59 minutes ago');
    expect(formatDate(ago(HOUR))).toBe('1 hour ago');
  });

  it('pluralises hours', () => {
    expect(formatDate(ago(3 * HOUR))).toBe('3 hours ago');
  });

  it('switches to days at the 24-hour boundary', () => {
    expect(formatDate(ago(23 * HOUR))).toBe('23 hours ago');
    expect(formatDate(ago(DAY))).toBe('1 day ago');
  });

  it('pluralises days', () => {
    expect(formatDate(ago(6 * DAY))).toBe('6 days ago');
  });

  it('switches to months at 30 days', () => {
    expect(formatDate(ago(29 * DAY))).toBe('29 days ago');
    expect(formatDate(ago(30 * DAY))).toBe('1 month ago');
  });

  it('pluralises months', () => {
    expect(formatDate(ago(90 * DAY))).toBe('3 months ago');
  });

  it('switches to years once the month count reaches 12', () => {
    expect(formatDate(ago(365 * DAY))).toBe('1 year ago');
  });

  it('pluralises years', () => {
    expect(formatDate(ago(2 * 365 * DAY))).toBe('2 years ago');
  });

  it('treats a timestamp exactly now as less than a minute', () => {
    expect(formatDate(NOW.toISOString())).toBe('less than a minute ago');
  });

  it('treats a future timestamp as less than a minute rather than emitting a negative', () => {
    expect(formatDate(new Date(NOW.getTime() + HOUR).toISOString())).toBe('less than a minute ago');
  });
});
