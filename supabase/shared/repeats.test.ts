// Unit tests for the pure resolution logic (`pickRepeat`, `toRepeat`) and the read-visibility
// filtering (`fetchRepeats`) behind every "who sees which schedule" decision in this app — written
// to pin down whether a participant's own field-group schedule override actually surfaces on a
// fresh read, since that's exactly what was reported broken.

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchRepeats, fromRepeat, pickRepeat, toRepeat } from './repeats.ts';
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
    repeats: [{
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
    repeats: [{ data: [{ field_group_id: 'fg1', user_id: 'owner', byhour: '08', byminute: '00' }], error: null }],
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
    repeats: [{ data: [{ field_group_id: 'fg1', user_id: 'owner', byhour: '08', byminute: '00' }], error: null }],
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
    repeats: [{
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
    repeats: [{ data: [{ field_group_id: 'unrelated-fg', user_id: 'owner', byhour: '08', byminute: '00' }], error: null }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: true }],
    'owner',
  );
  assertEquals(result, {});
});
