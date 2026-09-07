import { occursOnDate, nextOccurrenceLabel } from './rruleUtils';

// Every date below is constructed via Date.UTC so it lines up exactly with occursOnDate's own
// UTC-midnight-of-calendar-day comparison, regardless of the machine's local timezone running
// this test.
const utcDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('occursOnDate', () => {
  it('matches a simple weekly byday set, parity with the old hand-rolled check', () => {
    const repeat = { byday: 'MO,WE,FR' }; // Mon/Wed/Fri
    expect(occursOnDate(repeat, utcDate(2026, 9, 7))).toBe(true); // Monday
    expect(occursOnDate(repeat, utcDate(2026, 9, 8))).toBe(false); // Tuesday
    expect(occursOnDate(repeat, utcDate(2026, 9, 9))).toBe(true); // Wednesday
  });

  it('every day / not scheduled: a full 7-code byday matches every day, empty/absent matches none', () => {
    expect(occursOnDate({ byday: 'SU,MO,TU,WE,TH,FR,SA' }, utcDate(2026, 9, 8))).toBe(true);
    expect(occursOnDate({ byday: '' }, utcDate(2026, 9, 8))).toBe(false);
    expect(occursOnDate(undefined, utcDate(2026, 9, 8))).toBe(false);
  });

  it('interval: 2 only matches every other occurrence of the weekday, anchored at startedAt', () => {
    // Friday 2026-09-04, every 2 weeks.
    const repeat = { byday: 'FR', interval: 2, startedAt: utcDate(2026, 9, 4).toISOString() };
    expect(occursOnDate(repeat, utcDate(2026, 9, 4))).toBe(true); // week 0 — on schedule
    expect(occursOnDate(repeat, utcDate(2026, 9, 11))).toBe(false); // week 1 — skipped
    expect(occursOnDate(repeat, utcDate(2026, 9, 18))).toBe(true); // week 2 — on schedule
  });

  it('count limits how many occurrences are generated', () => {
    const repeat = { byday: 'FR', count: 2, startedAt: utcDate(2026, 9, 4).toISOString() };
    expect(occursOnDate(repeat, utcDate(2026, 9, 4))).toBe(true); // occurrence 1
    expect(occursOnDate(repeat, utcDate(2026, 9, 11))).toBe(true); // occurrence 2
    expect(occursOnDate(repeat, utcDate(2026, 9, 18))).toBe(false); // exhausted
  });

  it('until (UNTIL) cuts off future occurrences', () => {
    const repeat = {
      byday: 'FR',
      startedAt: utcDate(2026, 9, 4).toISOString(),
      until: utcDate(2026, 9, 11).toISOString(),
    };
    expect(occursOnDate(repeat, utcDate(2026, 9, 11))).toBe(true); // on the boundary — inclusive
    expect(occursOnDate(repeat, utcDate(2026, 9, 18))).toBe(false); // after UNTIL
  });

  it('never matches before startedAt (DTSTART)', () => {
    const repeat = { byday: 'SU,MO,TU,WE,TH,FR,SA', startedAt: utcDate(2026, 9, 10).toISOString() };
    expect(occursOnDate(repeat, utcDate(2026, 9, 9))).toBe(false);
    expect(occursOnDate(repeat, utcDate(2026, 9, 10))).toBe(true);
  });
});

describe('nextOccurrenceLabel', () => {
  it('returns "Tomorrow" for the very next day', () => {
    const repeat = { byday: 'MO,WE,FR' }; // Mon/Wed/Fri
    expect(nextOccurrenceLabel(repeat, utcDate(2026, 9, 8))).toBe('Tomorrow'); // Tue -> Wed
  });

  it('returns the short weekday name otherwise', () => {
    const repeat = { byday: 'FR' }; // Fri only
    expect(nextOccurrenceLabel(repeat, utcDate(2026, 9, 7))).toBe('Fri'); // Mon -> next Fri
  });

  it('undefined once count/until is exhausted, or with no schedule at all', () => {
    const repeat = { byday: 'FR', count: 1, startedAt: utcDate(2026, 9, 4).toISOString() };
    expect(nextOccurrenceLabel(repeat, utcDate(2026, 9, 4))).toBeUndefined();
    expect(nextOccurrenceLabel(undefined, utcDate(2026, 9, 4))).toBeUndefined();
  });
});
