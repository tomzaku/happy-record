// Regression coverage for embedding a template's own field groups directly on the
// checklist-templates wire (see checklist-templates-dto.ts's own header comment on why) — this is
// the batched version of field-groups' own repository.ts `withRepeats`, so these tests focus on
// what's actually new here: grouping many templates' rows into one map in a single pass, and
// carrying each row's own template's public/private status through to its schedule resolution.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchFieldGroupsByTemplates } from './fieldGroups.ts';
import { fakeSupabase } from './testSupport/fakeSupabase.ts';

Deno.test('fetchFieldGroupsByTemplates: groups rows spanning multiple templates by their own template id', async () => {
  const db = fakeSupabase({
    field_groups: [{
      data: [
        { id: 'g1', checklist_template_id: 't1', title: 'Push', fields: [], position: 0, user_id: 'owner-1', updated_at: 'now' },
        { id: 'g2', checklist_template_id: 't2', title: 'Pull', fields: [], position: 0, user_id: 'owner-2', updated_at: 'now' },
        { id: 'g3', checklist_template_id: 't1', title: 'Legs', fields: [], position: 1, user_id: 'owner-1', updated_at: 'now' },
      ],
      error: null,
    }],
    schedules: [{ data: [], error: null }],
  });

  const result = await fetchFieldGroupsByTemplates(db, 'owner-1', [
    { id: 't1', ownerUserId: 'owner-1', isPublic: false },
    { id: 't2', ownerUserId: 'owner-2', isPublic: false },
  ]);

  assertEquals(result.t1.map(g => g.id), ['g1', 'g3']);
  assertEquals(result.t2.map(g => g.id), ['g2']);
});

Deno.test('fetchFieldGroupsByTemplates: a viewer sees a public template\'s group with the owner\'s schedule, not their own missing one', async () => {
  const db = fakeSupabase({
    field_groups: [{
      data: [{ id: 'g1', checklist_template_id: 't1', title: 'Push', fields: [], position: 0, user_id: 'owner-1', updated_at: 'now' }],
      error: null,
    }],
    schedules: [{
      data: [{ field_group_id: 'g1', user_id: 'owner-1', byhour: 8, byminute: 0, freq: 'WEEKLY', byday: 'MO,WE,FR', started_at: null }],
      error: null,
    }],
  });

  const result = await fetchFieldGroupsByTemplates(db, 'viewer-1', [
    { id: 't1', ownerUserId: 'owner-1', isPublic: true },
  ]);

  const repeat = result.t1[0].repeat as { byday?: string } | undefined;
  assertEquals(repeat?.byday, 'MO,WE,FR');
});

Deno.test('fetchFieldGroupsByTemplates: a private template\'s schedule stays hidden from a non-owner viewer', async () => {
  const db = fakeSupabase({
    field_groups: [{
      data: [{ id: 'g1', checklist_template_id: 't1', title: 'Push', fields: [], position: 0, user_id: 'owner-1', updated_at: 'now' }],
      error: null,
    }],
    schedules: [{
      data: [{ field_group_id: 'g1', user_id: 'owner-1', byhour: 8, byminute: 0, freq: 'WEEKLY', byday: 'MO,WE,FR', started_at: null }],
      error: null,
    }],
  });

  const result = await fetchFieldGroupsByTemplates(db, 'viewer-1', [
    { id: 't1', ownerUserId: 'owner-1', isPublic: false },
  ]);

  assertEquals((result.t1[0] as { repeat?: unknown }).repeat, undefined);
});

Deno.test('fetchFieldGroupsByTemplates: archived groups are still included, not filtered out', async () => {
  const db = fakeSupabase({
    field_groups: [{
      data: [{
        id: 'g1', checklist_template_id: 't1', title: 'Push', fields: [], position: 0, user_id: 'owner-1',
        archived_at: '2026-01-01T00:00:00.000Z', updated_at: 'now',
      }],
      error: null,
    }],
    schedules: [{ data: [], error: null }],
  });

  const result = await fetchFieldGroupsByTemplates(db, 'owner-1', [{ id: 't1', ownerUserId: 'owner-1', isPublic: false }]);
  assertEquals((result.t1[0] as { archivedAt?: string }).archivedAt, '2026-01-01T00:00:00.000Z');
});

Deno.test('fetchFieldGroupsByTemplates: no templates means no query at all', async () => {
  const db = fakeSupabase({});
  const result = await fetchFieldGroupsByTemplates(db, 'owner-1', []);
  assertEquals(result, {});
});
