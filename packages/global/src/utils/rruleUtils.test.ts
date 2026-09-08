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

  it('exceptionDates wins over a real byday match — Google Calendar-style "delete this one occurrence"', () => {
    const repeat = { byday: 'MO,WE,FR', exceptionDates: ['2026-09-09'] }; // skip this one Wednesday
    expect(occursOnDate(repeat, utcDate(2026, 9, 7))).toBe(true); // Monday — untouched
    expect(occursOnDate(repeat, utcDate(2026, 9, 9))).toBe(false); // Wednesday — deleted
    expect(occursOnDate(repeat, utcDate(2026, 9, 11))).toBe(true); // Friday — untouched
    expect(occursOnDate(repeat, utcDate(2026, 9, 16))).toBe(true); // next Wednesday — a different date, still matches
  });

  it('exceptionDates also wins over a genuine one-time (recurring: false) arrangement', () => {
    const repeat = { startedAt: utcDate(2026, 9, 8).toISOString(), recurring: false, exceptionDates: ['2026-09-10'] };
    expect(occursOnDate(repeat, utcDate(2026, 9, 9))).toBe(true);
    expect(occursOnDate(repeat, utcDate(2026, 9, 10))).toBe(false); // this one day skipped
    expect(occursOnDate(repeat, utcDate(2026, 9, 11))).toBe(true);
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

  it('a stale recurring: false never overrides a real byday pattern — regression for "picked Tue/Thu/Sun, it repeated every day instead"', () => {
    // Exactly the reported repeat shape: a template edited to add a weekly Tue/Thu/Sun-every-
    // other-week pattern, but still carrying `recurring: false` left over from before it had one
    // (ChecklistGenericInfo's Schedule dialog only ever writes back whatever the "Repeats past
    // this window" checkbox already held — see occursOnDate's own comment on why this used to
    // silently ignore byday and match every day instead).
    const repeat = {
      startedAt: utcDate(2026, 9, 8).toISOString(), // Tuesday
      byday: 'TU,TH,SU',
      interval: 2,
      recurring: false,
    };
    expect(occursOnDate(repeat, utcDate(2026, 9, 7))).toBe(false); // Monday — never a match
    expect(occursOnDate(repeat, utcDate(2026, 9, 8))).toBe(true); // Tuesday
    expect(occursOnDate(repeat, utcDate(2026, 9, 9))).toBe(false); // Wednesday — never a match
    expect(occursOnDate(repeat, utcDate(2026, 9, 10))).toBe(true); // Thursday
    expect(occursOnDate(repeat, utcDate(2026, 9, 12))).toBe(false); // Saturday — never a match
    expect(occursOnDate(repeat, utcDate(2026, 9, 13))).toBe(true); // Sunday
  });

  it('durationMinutes is display-only — a multi-day occurrence only matches its own start day, not the days it runs through', () => {
    // 2026-09-08 05:00 -> 2026-09-11 08:00, weekly on Tuesdays (2026-09-08 and 2026-09-15 both
    // are) — a 75h/4500min occurrence spanning three calendar days. Documents the known gap: a
    // long duration doesn't make the schedule "occur" on the days it's still running through.
    const repeat = {
      byday: 'TU',
      startedAt: utcDate(2026, 9, 8).toISOString(),
      durationMinutes: 4500,
    };
    expect(occursOnDate(repeat, utcDate(2026, 9, 8))).toBe(true); // the occurrence's own start day
    expect(occursOnDate(repeat, utcDate(2026, 9, 9))).toBe(false); // still running, but not matched
    expect(occursOnDate(repeat, utcDate(2026, 9, 10))).toBe(false); // ditto — still before UNTIL-less end
    expect(occursOnDate(repeat, utcDate(2026, 9, 15))).toBe(true); // next week's own start day
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

  it('a stale recurring: false never overrides a real byday pattern here either — same regression as occursOnDate', () => {
    const repeat = {
      startedAt: utcDate(2026, 9, 8).toISOString(), // Tuesday
      byday: 'TU,TH,SU',
      interval: 2,
      recurring: false,
    };
    expect(nextOccurrenceLabel(repeat, utcDate(2026, 9, 8))).toBe('Thu'); // Tue -> next is Thursday
    expect(nextOccurrenceLabel(repeat, utcDate(2026, 9, 10))).toBe('Sun'); // Thu -> next is Sunday
  });

  it('undefined once count/until is exhausted, or with no schedule at all', () => {
    const repeat = { byday: 'FR', count: 1, startedAt: utcDate(2026, 9, 4).toISOString() };
    expect(nextOccurrenceLabel(repeat, utcDate(2026, 9, 4))).toBeUndefined();
    expect(nextOccurrenceLabel(undefined, utcDate(2026, 9, 4))).toBeUndefined();
  });
});
