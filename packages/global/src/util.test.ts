import { uniqueId, pipe, getLocalDateComponents } from './util';

describe('uniqueId', () => {
  it('returns a non-empty string', () => {
    expect(typeof uniqueId()).toBe('string');
    expect(uniqueId().length).toBeGreaterThan(0);
  });

  it('does not collide across consecutive calls', () => {
    // Not a proof of global uniqueness, but this is the property every
    // caller (fields, checklists, ...) actually relies on: two ids minted
    // back-to-back on the same device must differ.
    const ids = Array.from({ length: 100 }, () => uniqueId());
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('pipe', () => {
  it('threads data through each function left to right', () => {
    const addOne = (n: number) => n + 1;
    const double = (n: number) => n * 2;

    const result = pipe<number>(addOne, double)(3);

    expect(result).toBe(8); // (3 + 1) * 2
  });

  it('returns the input unchanged when given no functions', () => {
    expect(pipe<number>()(5)).toBe(5);
  });
});

describe('getLocalDateComponents', () => {
  it('splits an ISO date string into day/month/year', () => {
    expect(getLocalDateComponents('2026-08-22T10:00:00.000Z')).toEqual({
      day: 22,
      month: 8,
      year: 2026,
    });
  });

  it('reports 1-indexed months', () => {
    // date-fns' getMonth() is 0-indexed; the whole point of this helper is
    // converting that to the calendar month callers expect.
    expect(getLocalDateComponents('2026-01-05T00:00:00.000Z').month).toBe(1);
  });
});
