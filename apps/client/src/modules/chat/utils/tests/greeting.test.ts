import { describe, expect, it } from 'vitest';
import { getGreeting } from '@/modules/chat/utils/greeting';

const at = (hour: number) => new Date(2026, 9, 27, hour, 30);

describe('getGreeting', () => {
  it.each([
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good afternoon'],
    [18, 'Good evening'],
    [23, 'Good evening'],
  ])('greets at %i:30 with "%s"', (hour, greeting) => {
    expect(getGreeting(at(hour))).toBe(greeting);
  });

  it('adds the first name only', () => {
    expect(getGreeting(at(19), 'David Poslušný')).toBe('Good evening, David');
  });

  it('leaves the name out when there is none', () => {
    expect(getGreeting(at(19), null)).toBe('Good evening');
    expect(getGreeting(at(19), '   ')).toBe('Good evening');
  });
});
