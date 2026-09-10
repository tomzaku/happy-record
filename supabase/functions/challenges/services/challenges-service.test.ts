// A soft-deleted checklist template (checklist-templates-service.ts's own `deleteTemplate` only
// ever sets `deleted_at` — the row itself stays) must stop surfacing its challenge in "My
// Challenges" for both its owner and any participant, even though the `challenges`/
// `challenge_participants` rows themselves are untouched by that delete. See the bug this pins
// down: an owner who deletes a shared template kept seeing it in their own challenge list.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { listMyChallenges } from './challenges-service.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('listMyChallenges: drops an owned challenge whose template was soft-deleted', async () => {
  const db = fakeSupabase({
    challenges: [{ data: [{ id: 'c1', checklist_template_id: 't1', owner_id: 'u1' }], error: null }],
    challenge_participants: [
      { data: [], error: null }, // fetchMyParticipantRows
    ],
    checklist_templates: [
      { data: [{ id: 't1', title: 'Gone', avatar: {}, deleted_at: '2026-01-01T00:00:00.000Z' }], error: null }, // fetchTemplatesMeta
    ],
  });

  const result = await listMyChallenges({ db, userId: 'u1' } as never);
  assertEquals(result, []);
});

Deno.test('listMyChallenges: keeps an owned challenge whose template is not deleted', async () => {
  const db = fakeSupabase({
    challenges: [{ data: [{ id: 'c1', checklist_template_id: 't1', owner_id: 'u1' }], error: null }],
    challenge_participants: [
      { data: [], error: null }, // fetchMyParticipantRows
      { data: [], error: null }, // fetchParticipantChallengeIds
    ],
    checklist_templates: [
      { data: [{ id: 't1', title: 'Still here', avatar: {}, deleted_at: null }], error: null }, // fetchTemplatesMeta
    ],
    checklists: [{ data: [], error: null }],
    submissions: [{ data: [], error: null }],
  });

  const result = await listMyChallenges({ db, userId: 'u1' } as never);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, 'c1');
  assertEquals(result[0].title, 'Still here');
});
