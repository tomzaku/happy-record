// Unit tests for `fetchSharedChallengeParticipation` — the peer-visibility join
// `media-access-service.ts`'s `checkCanReadMedia` relies on. Written to pin down each of the
// three narrowing steps (same challenge for both users, on the *right* per-user template id, and
// `share_records` actually on) independently, since a bug in any one of them either leaks a
// private upload or wrongly denies a real participant.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchSharedChallengeParticipation } from './media-repository.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('fetchSharedChallengeParticipation: true when both share a challenge with share_records on', async () => {
  const db = fakeSupabase({
    challenge_participants: [
      { data: [{ challenge_id: 'c1' }], error: null }, // owner's own participant row(s)
      { data: [{ challenge_id: 'c1' }], error: null }, // viewer's own participant row(s)
    ],
    challenges: [{ data: [{ id: 'c1' }], error: null }],
  });
  const result = await fetchSharedChallengeParticipation(db, {
    mediaOwnerId: 'owner',
    viewerId: 'viewer',
    checklistTemplateId: 'template-1',
  });
  assertEquals(result, true);
});

Deno.test('fetchSharedChallengeParticipation: false when the owner has no participant row for this template', async () => {
  const db = fakeSupabase({
    challenge_participants: [{ data: [], error: null }],
  });
  const result = await fetchSharedChallengeParticipation(db, {
    mediaOwnerId: 'owner',
    viewerId: 'viewer',
    checklistTemplateId: 'template-1',
  });
  assertEquals(result, false);
});

Deno.test('fetchSharedChallengeParticipation: false when the viewer is not a participant of any of the owner\'s challenges', async () => {
  const db = fakeSupabase({
    challenge_participants: [
      { data: [{ challenge_id: 'c1' }], error: null },
      { data: [], error: null },
    ],
  });
  const result = await fetchSharedChallengeParticipation(db, {
    mediaOwnerId: 'owner',
    viewerId: 'viewer',
    checklistTemplateId: 'template-1',
  });
  assertEquals(result, false);
});

Deno.test('fetchSharedChallengeParticipation: false when the shared challenge has share_records off', async () => {
  const db = fakeSupabase({
    challenge_participants: [
      { data: [{ challenge_id: 'c1' }], error: null },
      { data: [{ challenge_id: 'c1' }], error: null },
    ],
    challenges: [{ data: [], error: null }], // eq('share_records', true) matched nothing
  });
  const result = await fetchSharedChallengeParticipation(db, {
    mediaOwnerId: 'owner',
    viewerId: 'viewer',
    checklistTemplateId: 'template-1',
  });
  assertEquals(result, false);
});
