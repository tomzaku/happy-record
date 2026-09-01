// Unit tests for the two repository functions behind the dashboard's own attachments section
// (`challenges-service.ts`'s `getAttachments`) — mostly pass-through queries, but each has an
// empty-input short-circuit worth pinning down (an empty `fieldIds`/`userIds` list must never
// become an unscoped `.in('id', [])`-style query that accidentally reads everything).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchFieldTypesByIds, fetchMediaChecklistRecordsForUsersInRange } from './challenges-repository.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('fetchFieldTypesByIds: empty fieldIds short-circuits without querying', async () => {
  const db = fakeSupabase({});
  assertEquals(await fetchFieldTypesByIds(db, []), []);
});

Deno.test('fetchFieldTypesByIds: returns the rows as-is', async () => {
  const db = fakeSupabase({
    fields: [{ data: [{ id: 'f1', type: 'photo' }, { id: 'f2', type: 'number' }], error: null }],
  });
  const result = await fetchFieldTypesByIds(db, ['f1', 'f2']);
  assertEquals(result, [{ id: 'f1', type: 'photo' }, { id: 'f2', type: 'number' }]);
});

Deno.test('fetchMediaChecklistRecordsForUsersInRange: empty fieldIds or userIds short-circuits without querying', async () => {
  const db = fakeSupabase({});
  assertEquals(await fetchMediaChecklistRecordsForUsersInRange(db, [], ['u1'], 'a', 'b', 100), []);
  assertEquals(await fetchMediaChecklistRecordsForUsersInRange(db, ['f1'], [], 'a', 'b', 100), []);
});

Deno.test('fetchMediaChecklistRecordsForUsersInRange: returns the rows as-is', async () => {
  const db = fakeSupabase({
    checklist_records: [{
      data: [{ user_id: 'u1', field_id: 'f1', value_text: 'media-1', created_at: '2026-09-01T00:00:00.000Z' }],
      error: null,
    }],
  });
  const result = await fetchMediaChecklistRecordsForUsersInRange(db, ['f1'], ['u1'], 'a', 'b', 100);
  assertEquals(result, [{ user_id: 'u1', field_id: 'f1', value_text: 'media-1', created_at: '2026-09-01T00:00:00.000Z' }]);
});
