// Unit tests for `checkCanReact`/`checkCanClearReaction`'s shared tier-1 visibility rule — owner,
// or anyone once the linked template is public. Deliberately lighter than `challenge-comments`'
// own participant-only gate: reacting never requires actual membership.

import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkCanClearReaction, checkCanReact } from './challenge-reactions-access-service.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { ApiError } from '../../../shared/cors.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

const challengeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'challenge-1',
  owner_id: 'owner',
  checklist_template_id: 'template-1',
  ...overrides,
});

const fakeReq = (body: Record<string, unknown>) => ({ json: () => Promise.resolve(body) } as unknown as Request);

Deno.test('checkCanClearReaction: an unknown challenge is a 404, not a 403', async () => {
  const db = fakeSupabase({ challenges: [{ data: null, error: null }] });
  const url = new URL('https://x/challenge-reactions?challengeId=nope');
  await assertRejects(
    () => checkCanClearReaction({ db, userId: 'someone', url } as never),
    ApiError,
  );
});

Deno.test('checkCanClearReaction: the owner is always allowed', async () => {
  const db = fakeSupabase({ challenges: [{ data: challengeRow(), error: null }] });
  const url = new URL('https://x/challenge-reactions?challengeId=challenge-1');
  const challengeId = await checkCanClearReaction({ db, userId: 'owner', url } as never);
  assertEquals(challengeId, 'challenge-1');
});

Deno.test('checkCanClearReaction: a non-owner is forbidden when the template is private', async () => {
  const db = fakeSupabase({
    challenges: [{ data: challengeRow(), error: null }],
    checklist_templates: [{ data: { visibility: 'private' }, error: null }],
  });
  const url = new URL('https://x/challenge-reactions?challengeId=challenge-1');
  await assertRejects(
    () => checkCanClearReaction({ db, userId: 'stranger', url } as never),
    ForbiddenError,
  );
});

Deno.test('checkCanClearReaction: a non-owner is allowed once the template is public', async () => {
  const db = fakeSupabase({
    challenges: [{ data: challengeRow(), error: null }],
    checklist_templates: [{ data: { visibility: 'public' }, error: null }],
  });
  const url = new URL('https://x/challenge-reactions?challengeId=challenge-1');
  const challengeId = await checkCanClearReaction({ db, userId: 'stranger', url } as never);
  assertEquals(challengeId, 'challenge-1');
});

Deno.test('checkCanReact: 400s on a missing or invalid reaction', async () => {
  const db = fakeSupabase({ challenges: [{ data: challengeRow(), error: null }] });
  await assertRejects(
    () => checkCanReact({ db, userId: 'owner', req: fakeReq({ challengeId: 'challenge-1', reaction: 'shrug' }) } as never),
    ApiError,
  );
});

Deno.test('checkCanReact: returns the challengeId/reaction once visibility passes', async () => {
  const db = fakeSupabase({ challenges: [{ data: challengeRow(), error: null }] });
  const result = await checkCanReact({
    db,
    userId: 'owner',
    req: fakeReq({ challengeId: 'challenge-1', reaction: 'like' }),
  } as never);
  assertEquals(result, { challengeId: 'challenge-1', reaction: 'like' });
});
