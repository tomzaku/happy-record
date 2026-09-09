// Unit tests for the pure resolution logic (`pickRepeat`, `toRepeat`) and the read-visibility
// filtering (`fetchRepeats`) behind every "who sees which schedule" decision in this app — written
// to pin down whether a participant's own field-group schedule override actually surfaces on a
// fresh read, since that's exactly what was reported broken.

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchRepeats, fromRepeat, occurrenceDayMatches, pickRepeat, resolveOccurrenceEnd, toRepeat } from './schedules.ts';
import { fakeSupabase } from './testSupport/fakeSupabase.ts';

Deno.test('pickRepeat: the viewer\'s own row wins over the owner\'s', () => {
  const rows = [
    { user_id: 'owner', byhour: '08', byminute: '00' },
    { user_id: 'viewer', byhour: '20', byminute: '30' },
  ];
  assertEquals(pickRepeat(rows, 'viewer', 'owner')?.byhour, '20');
});

Deno.test('pickRepeat: falls back to the owner\'s row when the viewer has none of their own', () => {
  const rows = [{ user_id: 'owner', byhour: '08', byminute: '00' }];
  assertEquals(pickRepeat(rows, 'viewer', 'owner')?.user_id, 'owner');
});

Deno.test('pickRepeat: undefined for no rows at all', () => {
  assertEquals(pickRepeat(undefined, 'viewer', 'owner'), undefined);
  assertEquals(pickRepeat([], 'viewer', 'owner'), undefined);
});

Deno.test('toRepeat: undefined when every schedule field is null', () => {
  assertEquals(
    toRepeat({
      byhour: null,
      byminute: null,
      byday: null,
      freq: null,
      started_at: null,
    }),
    undefined,
  );
});

Deno.test('toRepeat: populated once any field is set, even with the rest null', () => {
  const repeat = toRepeat({
    byminute: 0,
    byhour: 8,
    byday: 'MO,SU',
    freq: 'WEEKLY',
    started_at: null,
  });
  assertEquals(repeat, {
    byminute: '0',
    byhour: '8',
    byday: 'MO,SU',
    startedAt: null,
    freq: 'WEEKLY',
    recurring: true,
  });
});

Deno.test('fromRepeat/toRepeat: byday round-trips unchanged — no server-side day-format translation any more', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'SU,MO,TU,WE,TH,FR,SA' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.byday, 'SU,MO,TU,WE,TH,FR,SA');
  assertEquals(toRepeat(row)?.byday, 'SU,MO,TU,WE,TH,FR,SA');
});

Deno.test('toRepeat: never surfaces the debug-only rrule column', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'MO,WE,FR' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(typeof row.rrule, 'string');
  assertEquals('rrule' in (toRepeat(row) ?? {}), false);
});

Deno.test('fromRepeat/toRepeat: interval/count round-trip, and interval of 1 is omitted as the default', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'FR', interval: 2, count: 6 },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.interval, 2);
  assertEquals(row.count, 6);
  assertEquals(toRepeat(row), {
    byminute: '0',
    byhour: '8',
    byday: 'FR',
    startedAt: row.started_at,
    interval: 2,
    count: 6,
    freq: 'WEEKLY',
    recurring: true,
  });

  const defaultIntervalRow = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'FR', interval: 1 },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals((toRepeat(defaultIntervalRow) as Record<string, unknown>).interval, undefined);
});

Deno.test('fromRepeat/toRepeat: until round-trips through the until column', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'SU,MO,TU,WE,TH,FR,SA', until: '2026-12-31T23:59:59.999Z' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.until, '2026-12-31T23:59:59.999Z');
  assertEquals(toRepeat(row)?.until, '2026-12-31T23:59:59.999Z');
});

Deno.test('fromRepeat/toRepeat: durationMs round-trips through the duration column, including a multi-day span', () => {
  // 4500 minutes = 75h = 270000000ms — an occurrence that starts one calendar day and runs into
  // a later one (e.g. 09/08 05:00 -> 09/11 08:00). durationMs is a plain millisecond count, so a
  // multi-day span is no different from a same-day one here — no month/year-length ambiguity the
  // way a calendar-relative unit would have (see the migration's own comment).
  const row = fromRepeat(
    { byhour: '05', byminute: '00', byday: 'TU', durationMs: 270000000 },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.duration, 270000000);
  assertEquals(toRepeat(row)?.durationMs, 270000000);
});

Deno.test('fromRepeat: durationMs is null when omitted or non-positive, never a stray 0', () => {
  const omitted = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'MO' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(omitted.duration, null);

  const zero = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'MO', durationMs: 0 },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(zero.duration, null);
});

Deno.test('fromRepeat: defaults started_at to now on a checklist_template row when the client omits it', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'SU,MO,TU,WE,TH,FR,SA' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(typeof row.started_at, 'string');
  assertNotEquals(row.started_at, null);
});

Deno.test('fromRepeat: keeps the client\'s own started_at on a checklist_template row when it sends one', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'SU,MO,TU,WE,TH,FR,SA', startedAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.started_at, '2026-01-01T00:00:00.000Z');
});

Deno.test('fromRepeat/toRepeat: timezone round-trips through the row', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'SU,MO,TU,WE,TH,FR,SA', startedAt: '2026-01-01T00:00:00.000Z', timezone: 'Asia/Ho_Chi_Minh' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.timezone, 'Asia/Ho_Chi_Minh');
  assertEquals(toRepeat(row)?.timezone, 'Asia/Ho_Chi_Minh');
});

Deno.test('fromRepeat: never defaults started_at on a field_group row — not a concept there', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'SU,MO,TU,WE,TH,FR,SA' },
    { userId: 'owner', fieldGroupId: 'fg1' },
  );
  assertEquals(row.started_at, null);
});

Deno.test('fromRepeat: a missing/invalid freq still falls back to deriving it from byday', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'MO,WE,FR' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.freq, 'WEEKLY');

  const noScheduleRow = fromRepeat(
    { byhour: '', byminute: '', byday: '' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(noScheduleRow.freq, null);
});

Deno.test('fromRepeat: a client-sent freq is kept as-is', () => {
  const row = fromRepeat(
    { byhour: '08', byminute: '00', byday: 'MO,WE,FR', freq: 'WEEKLY' },
    { userId: 'owner', checklistTemplateId: 'ct1' },
  );
  assertEquals(row.freq, 'WEEKLY');
});

Deno.test('fetchRepeats: the caller\'s own row is always visible, even on a non-public owner', async () => {
  const db = fakeSupabase({
    schedules: [{
      data: [
        { field_group_id: 'fg1', user_id: 'participant', byhour: '08', byminute: '00' },
        { field_group_id: 'fg1', user_id: 'owner', byhour: '20', byminute: '00' },
      ],
      error: null,
    }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: false }],
    'participant',
  );
  const rows = result['fg1'] ?? [];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].user_id, 'participant');
});

Deno.test('fetchRepeats: the owner\'s row is visible to anyone once the owner is public', async () => {
  const db = fakeSupabase({
    schedules: [{ data: [{ field_group_id: 'fg1', user_id: 'owner', byhour: '08', byminute: '00' }], error: null }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: true }],
    'someone-else',
  );
  assertEquals(result['fg1']?.[0]?.user_id, 'owner');
});

Deno.test('fetchRepeats: the owner\'s row is hidden when the owner is not public', async () => {
  const db = fakeSupabase({
    schedules: [{ data: [{ field_group_id: 'fg1', user_id: 'owner', byhour: '08', byminute: '00' }], error: null }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: false }],
    'someone-else',
  );
  assertEquals(result['fg1'] ?? [], []);
});

Deno.test('fetchRepeats: another participant\'s override never leaks, even on a public owner', async () => {
  const db = fakeSupabase({
    schedules: [{
      data: [
        { field_group_id: 'fg1', user_id: 'owner', byhour: '08', byminute: '00' },
        { field_group_id: 'fg1', user_id: 'other-participant', byhour: '20', byminute: '00' },
      ],
      error: null,
    }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: true }],
    'me',
  );
  const rows = result['fg1'] ?? [];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].user_id, 'owner');
});

Deno.test('fetchRepeats: a row for an owner id not in the batch is dropped defensively', async () => {
  const db = fakeSupabase({
    schedules: [{ data: [{ field_group_id: 'unrelated-fg', user_id: 'owner', byhour: '08', byminute: '00' }], error: null }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: true }],
    'owner',
  );
  assertEquals(result, {});
});

Deno.test('occurrenceDayMatches: the schedule\'s own DTSTART day matches, read through its timezone (not a bare UTC day)', () => {
  // "2026-09-08T17:00:00.000Z" is local midnight Sep 9 in Asia/Saigon (UTC+7) — a Wednesday. A
  // bare UTC read of the same instant lands on Sep 8, a Tuesday, which is NOT in byday — exactly
  // the bug `calendarDayIn` exists to avoid (see occurrenceDayMatches' own doc comment).
  const repeatRow = { byday: 'WE', started_at: '2026-09-08T17:00:00.000Z', timezone: 'Asia/Saigon' };
  assertEquals(occurrenceDayMatches(repeatRow, '2026-09-08T17:00:00.000Z'), true);
});

Deno.test('occurrenceDayMatches: a later occurrence of the same weekly pattern also matches', () => {
  // One week later — Sep 16 2026 local midnight, also a Wednesday.
  const repeatRow = { byday: 'WE', started_at: '2026-09-08T17:00:00.000Z', timezone: 'Asia/Saigon' };
  assertEquals(occurrenceDayMatches(repeatRow, '2026-09-15T17:00:00.000Z'), true);
});

Deno.test('occurrenceDayMatches: a startedAt on a day not in byday is rejected', () => {
  // Sep 10 2026 local midnight — a Thursday, not Wednesday.
  const repeatRow = { byday: 'WE', started_at: '2026-09-08T17:00:00.000Z', timezone: 'Asia/Saigon' };
  assertEquals(occurrenceDayMatches(repeatRow, '2026-09-09T17:00:00.000Z'), false);
});

Deno.test('occurrenceDayMatches: no byday at all is always rejected', () => {
  assertEquals(occurrenceDayMatches({ byday: null, timezone: 'Asia/Saigon' }, '2026-09-08T17:00:00.000Z'), false);
});

Deno.test('resolveOccurrenceEnd: startedAt + a real duration', () => {
  assertEquals(
    resolveOccurrenceEnd({ duration: 180 * 60000 }, '2026-09-27T02:00:00.000Z'),
    '2026-09-27T05:00:00.000Z',
  );
});

Deno.test('resolveOccurrenceEnd: no duration falls back to a 60-minute default', () => {
  assertEquals(resolveOccurrenceEnd({}, '2026-09-27T02:00:00.000Z'), '2026-09-27T03:00:00.000Z');
});
