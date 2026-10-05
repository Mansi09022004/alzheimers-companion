import { describe, expect, it } from 'vitest';

import { formatDistance, lastUpdatedLabel, plural } from './format';

describe('plural', () => {
  it('uses the singular only for exactly one', () => {
    expect(plural(1, 'day')).toBe('1 day');
    expect(plural(0, 'day')).toBe('0 days');
    expect(plural(2, 'day')).toBe('2 days');
    expect(plural(1, 'memory', 'memories')).toBe('1 memory');
    expect(plural(3, 'memory', 'memories')).toBe('3 memories');
  });
});

describe('lastUpdatedLabel', () => {
  it('says "just now" for fresh fixes', () => {
    expect(lastUpdatedLabel(30)).toBe('Updated just now');
  });

  it('never writes "1 minutes", "1 hours" or "1 days"', () => {
    expect(lastUpdatedLabel(3600)).toBe('Last updated 1 hour ago');
    expect(lastUpdatedLabel(86400)).toBe('Last updated 1 day ago');
    expect(lastUpdatedLabel(86400 + 3000)).toBe('Last updated 1 day ago');
  });

  it('pluralises larger values and never rounds up into the next unit', () => {
    expect(lastUpdatedLabel(5 * 60)).toBe('Last updated 5 minutes ago');
    expect(lastUpdatedLabel(3599)).toBe('Last updated 59 minutes ago');
    expect(lastUpdatedLabel(3 * 3600)).toBe('Last updated 3 hours ago');
    expect(lastUpdatedLabel(86399)).toBe('Last updated 23 hours ago');
    expect(lastUpdatedLabel(2 * 86400)).toBe('Last updated 2 days ago');
  });
});

describe('formatDistance', () => {
  it('uses metres under a kilometre and km above', () => {
    expect(formatDistance(850.4)).toBe('850 m');
    expect(formatDistance(2100)).toBe('2.1 km');
  });
});
