// Unit tests for the pure resolution logic (`pickRepeat`, `toRepeat`) and the read-visibility
// filtering (`fetchRepeats`) behind every "who sees which schedule" decision in this app — written
// to pin down whether a participant's own field-group schedule override actually surfaces on a
// fresh read, since that's exactly what was reported broken.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchRepeats, pickRepeat, toRepeat } from './repeats.ts';
import { fakeSupabase } from './testSupport/fakeSupabase.ts';

Deno.test('pickRepeat: the viewer\'s own row wins over the owner\'s', () => {
  const rows = [
    { user_id: 'owner', hour: '08', minute: '00' },
    { user_id: 'viewer', hour: '20', minute: '30' },
  ];
  assertEquals(pickRepeat(rows, 'viewer', 'owner')?.hour, '20');
});

Deno.test('pickRepeat: falls back to the owner\'s row when the viewer has none of their own', () => {
  const rows = [{ user_id: 'owner', hour: '08', minute: '00' }];
  assertEquals(pickRepeat(rows, 'viewer', 'owner')?.user_id, 'owner');
});

Deno.test('pickRepeat: undefined for no rows at all', () => {
  assertEquals(pickRepeat(undefined, 'viewer', 'owner'), undefined);
  assertEquals(pickRepeat([], 'viewer', 'owner'), undefined);
});

Deno.test('toRepeat: undefined when every schedule field is null', () => {
  assertEquals(
    toRepeat({
      minute: null,
      hour: null,
      day_of_month: null,
      month: null,
      day_of_week: null,
      started_at: null,
    }),
    undefined,
  );
});

Deno.test('toRepeat: populated once any field is set, even with the rest null', () => {
  const repeat = toRepeat({
    minute: '00',
    hour: '08',
    day_of_month: null,
    month: null,
    day_of_week: '1,0',
    started_at: null,
  });
  assertEquals(repeat, {
    minute: '00',
    hour: '08',
    dayOfMonth: null,
    month: null,
    dayOfWeek: '1,0',
    startedAt: null,
  });
});

Deno.test('fetchRepeats: the caller\'s own row is always visible, even on a non-public owner', async () => {
  const db = fakeSupabase({
    repeats: [{
      data: [
        { field_group_id: 'fg1', user_id: 'participant', hour: '08', minute: '00' },
        { field_group_id: 'fg1', user_id: 'owner', hour: '20', minute: '00' },
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
    repeats: [{ data: [{ field_group_id: 'fg1', user_id: 'owner', hour: '08', minute: '00' }], error: null }],
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
    repeats: [{ data: [{ field_group_id: 'fg1', user_id: 'owner', hour: '08', minute: '00' }], error: null }],
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
        { field_group_id: 'fg1', user_id: 'owner', hour: '08', minute: '00' },
        { field_group_id: 'fg1', user_id: 'other-participant', hour: '20', minute: '00' },
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
    repeats: [{ data: [{ field_group_id: 'unrelated-fg', user_id: 'owner', hour: '08', minute: '00' }], error: null }],
  });
  const result = await fetchRepeats(
    db,
    'fieldGroupId',
    [{ id: 'fg1', ownerUserId: 'owner', isPublic: true }],
    'owner',
  );
  assertEquals(result, {});
});
