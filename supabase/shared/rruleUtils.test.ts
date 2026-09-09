// Unit tests for rruleUtils.ts — the server's own occurrence-matching module, mirroring
// packages/global/src/utils/rruleUtils.test.ts's own coverage where the two overlap, plus the
// timezone-correctness case that's unique to this side (see this file's own header comment).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { exists, list } from './rruleUtils.ts';

// A Wednesday-only weekly schedule, DTSTART = local midnight Sep 9 2026 in Asia/Saigon, stored
// (as every date in this app is) as the UTC instant that represents — "2026-09-08T17:00:00.000Z".
const wednesdaySchedule = { byday: 'WE', started_at: '2026-09-08T17:00:00.000Z', timezone: 'Asia/Saigon' };

Deno.test('exists: the DTSTART day itself matches, read through the schedule\'s own timezone (not a bare UTC day)', () => {
  // A bare UTC read of "2026-09-08T17:00:00.000Z" lands on Sep 8, a Tuesday, which is NOT in
  // byday — exactly the bug calendarDayIn exists to avoid.
  assertEquals(exists(wednesdaySchedule, '2026-09-09'), true);
});

Deno.test('exists: a later occurrence of the same weekly pattern also matches', () => {
  assertEquals(exists(wednesdaySchedule, '2026-09-16'), true);
});

Deno.test('exists: a day not in byday is rejected', () => {
  assertEquals(exists(wednesdaySchedule, '2026-09-10'), false); // Thursday
});

Deno.test('exists: no byday at all is always rejected', () => {
  assertEquals(exists({ byday: null, timezone: 'Asia/Saigon' }, '2026-09-09'), false);
});

Deno.test('exists: no started_at (no DTSTART to anchor to) is rejected', () => {
  assertEquals(exists({ byday: 'WE', timezone: 'Asia/Saigon' }, '2026-09-09'), false);
});

Deno.test('list: every matching day within [from, to], inclusive by default', () => {
  assertEquals(list(wednesdaySchedule, '2026-09-09', '2026-09-23'), ['2026-09-09', '2026-09-16', '2026-09-23']);
});

Deno.test('list: includingFrom/includingTo drop the matching boundary day', () => {
  assertEquals(list(wednesdaySchedule, '2026-09-09', '2026-09-23', { includingFrom: false }), [
    '2026-09-16',
    '2026-09-23',
  ]);
  assertEquals(list(wednesdaySchedule, '2026-09-09', '2026-09-23', { includingTo: false }), [
    '2026-09-09',
    '2026-09-16',
  ]);
});

Deno.test('list: an interval > 1 (every other week) is respected', () => {
  assertEquals(list({ ...wednesdaySchedule, interval: 2 }, '2026-09-09', '2026-09-30'), [
    '2026-09-09',
    '2026-09-23',
  ]);
});

Deno.test('list: a count cap stops generating further occurrences', () => {
  assertEquals(list({ ...wednesdaySchedule, count: 2 }, '2026-09-09', '2026-12-31'), ['2026-09-09', '2026-09-16']);
});

Deno.test('list: an until cuts the range short, read through the schedule\'s own timezone', () => {
  // Until local midnight Sep 17 (Asia/Saigon) — Sep 16 is still in range, Sep 23 is not.
  assertEquals(
    list({ ...wednesdaySchedule, until: '2026-09-16T17:00:00.000Z' }, '2026-09-09', '2026-09-30'),
    ['2026-09-09', '2026-09-16'],
  );
});

Deno.test('list: no schedule at all returns an empty list, not an error', () => {
  assertEquals(list({ byday: null }, '2026-09-09', '2026-09-30'), []);
});

Deno.test('list: an empty range (from after to) returns an empty list', () => {
  assertEquals(list(wednesdaySchedule, '2026-09-23', '2026-09-09'), []);
});
