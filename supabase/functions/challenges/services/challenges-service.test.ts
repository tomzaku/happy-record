// A soft-deleted checklist template (checklist-templates-service.ts's own `deleteTemplate` only
// ever sets `deleted_at` — the row itself stays) must stop surfacing its challenge in "My
// Challenges" for both its owner and any participant, even though the `challenges`/
// `challenge_participants` rows themselves are untouched by that delete. See the bug this pins
// down: an owner who deletes a shared template kept seeing it in their own challenge list.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getTargets, listMyChallenges } from './challenges-service.ts';
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
      { data: [], error: null }, // fetchParticipantsForChallenges
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

// The list card wants a background image, a small avatar sample, and the caller's own total
// toward each target — all without a separate GET /challenges/:id dashboard fetch per card.
Deno.test('listMyChallenges: carries backgroundImageUrl, a participant sample, and myTotal per target', async () => {
  const db = fakeSupabase({
    challenges: [
      {
        data: [
          {
            id: 'c1',
            checklist_template_id: 't1',
            owner_id: 'u1',
            background_image_url: 'https://example.com/corner.png',
            page_background_image_url: 'https://example.com/full.png',
            start_date: '2026-01-01T00:00:00.000Z',
            targets: [
              {
                id: 'target-1',
                title: 'Total push up',
                unit: 'reps',
                icon: 'mdi:arm-flex',
                goal: 100,
                formula: 'push_ups',
                variables: { push_ups: 'field-push' },
              },
            ],
          },
        ],
        error: null,
      },
    ],
    challenge_participants: [
      { data: [], error: null }, // fetchMyParticipantRows
      {
        data: [
          { challenge_id: 'c1', user_id: 'u1', display_name: 'Tri Le', avatar_url: 'https://example.com/me.png', joined_at: '2026-01-01T00:00:00.000Z' },
          { challenge_id: 'c1', user_id: 'u2', display_name: 'Tom Le', avatar_url: null, joined_at: '2026-01-02T00:00:00.000Z' },
        ],
        error: null,
      }, // fetchParticipantsForChallenges
    ],
    checklist_templates: [{ data: [{ id: 't1', title: 'Push-ups', avatar: {}, deleted_at: null }], error: null }],
    checklists: [{ data: [], error: null }],
    submissions: [{ data: [], error: null }],
    fields: [{ data: [], error: null }], // fetchForkedFields (myTargetSummaries -> getTargets)
    checklist_records: [{ data: [{ field_id: 'field-push', user_id: 'u1', value_number: 12 }], error: null }],
  });

  const result = await listMyChallenges({ db, userId: 'u1' } as never);
  assertEquals(result.length, 1);
  const row = result[0];
  assertEquals(row.backgroundImageUrl, 'https://example.com/corner.png');
  assertEquals(row.pageBackgroundImageUrl, 'https://example.com/full.png');
  assertEquals(row.participantCount, 2);
  assertEquals(row.participants, [
    { userId: 'u1', displayName: 'Tri Le', avatarUrl: 'https://example.com/me.png' },
    { userId: 'u2', displayName: 'Tom Le' },
  ]);
  assertEquals(row.targets, [{ id: 'target-1', title: 'Total push up', unit: 'reps', icon: 'mdi:arm-flex', goal: 100, myTotal: 12 }]);
});

Deno.test('listMyChallenges: targets is empty for a challenge with no shared goals defined', async () => {
  const db = fakeSupabase({
    challenges: [{ data: [{ id: 'c1', checklist_template_id: 't1', owner_id: 'u1' }], error: null }],
    challenge_participants: [
      { data: [], error: null }, // fetchMyParticipantRows
      { data: [], error: null }, // fetchParticipantsForChallenges
    ],
    checklist_templates: [{ data: [{ id: 't1', title: 'No targets', avatar: {}, deleted_at: null }], error: null }],
    checklists: [{ data: [], error: null }],
    submissions: [{ data: [], error: null }],
  });

  const result = await listMyChallenges({ db, userId: 'u1' } as never);
  assertEquals(result[0].targets, []);
});

// A formula combining fields that a user logs in separate field-group Submit clicks — so no
// single `checklist_records.submission_id` ever carries all of them — used to always total 0 for
// every participant, since getTargets required the whole formula's variables on one submission.
// Sum-then-combine (each field summed per user first, formula evaluated once against those totals)
// is what actually fixes this.
Deno.test('getTargets: sums a formula\'s fields independently, not only when co-submitted', async () => {
  const challenge = {
    startDate: '2026-01-01T00:00:00.000Z',
    targets: [
      {
        id: 't1',
        title: 'Total push up',
        unit: 'reps',
        icon: 'mdi:arm-flex',
        goal: 5000,
        formula: 'push_ups + wide_push_ups + diamond_push_ups',
        variables: { push_ups: 'field-push', wide_push_ups: 'field-wide', diamond_push_ups: 'field-diamond' },
      },
    ],
  } as never;
  const participants = [{ userId: 'u1' }, { userId: 'u2' }] as never;

  const db = fakeSupabase({
    fields: [{ data: [], error: null }], // fetchForkedFields: no legacy forks
    checklist_records: [
      {
        data: [
          // u1: three separate Submit clicks, one field each — never co-submitted.
          { field_id: 'field-push', user_id: 'u1', value_number: 10 },
          { field_id: 'field-wide', user_id: 'u1', value_number: 5 },
          { field_id: 'field-diamond', user_id: 'u1', value_number: 2 },
          // u2: never logged diamond_push_ups at all.
          { field_id: 'field-push', user_id: 'u2', value_number: 20 },
          { field_id: 'field-wide', user_id: 'u2', value_number: 3 },
        ],
        error: null,
      },
    ],
  });

  const result = await getTargets(db, challenge, participants, ['u1', 'u2']);

  assertEquals(result.length, 1);
  const contributions = new Map(result[0].contributions.map(c => [c.userId, c.total]));
  assertEquals(contributions.get('u1'), 17);
  assertEquals(contributions.get('u2'), 23);
});

// The owner can override the implicit "never recorded = 0" fallback per variable
// (TargetFormulaEditor.tsx's own per-row fallback input) — a user with no rows for that field
// should use the configured value instead of 0.
Deno.test('getTargets: a variable never recorded falls back to variableDefaults, not always 0', async () => {
  const challenge = {
    startDate: '2026-01-01T00:00:00.000Z',
    targets: [
      {
        id: 't1',
        title: 'Total',
        unit: 'reps',
        icon: '',
        goal: 100,
        formula: 'push_ups + wide_push_ups',
        variables: { push_ups: 'field-push', wide_push_ups: 'field-wide' },
        variableDefaults: { wide_push_ups: 5 },
      },
    ],
  } as never;
  const participants = [{ userId: 'u1' }] as never;

  const db = fakeSupabase({
    fields: [{ data: [], error: null }],
    checklist_records: [
      { data: [{ field_id: 'field-push', user_id: 'u1', value_number: 10 }], error: null }, // never recorded wide_push_ups
    ],
  });

  const result = await getTargets(db, challenge, participants, ['u1']);
  assertEquals(result[0].contributions[0], { userId: 'u1', total: 15 });
});
