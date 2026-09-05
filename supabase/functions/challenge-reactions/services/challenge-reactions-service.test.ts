// Unit tests for `listReactionSummaries`' batch visibility filter — an id the caller can't see
// (private template, not the owner) must silently drop out of the result, not throw, matching
// every other batch read's "narrows without addressing one id" convention in this app.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { listReactionSummaries } from './challenge-reactions-service.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('listReactionSummaries: drops a private, non-owned challenge id from the result', async () => {
  const db = fakeSupabase({
    challenges: [{
      data: [
        { id: 'public-1', owner_id: 'owner', checklist_template_id: 'template-public' },
        { id: 'private-1', owner_id: 'someone-else', checklist_template_id: 'template-private' },
      ],
      error: null,
    }],
    checklist_templates: [{
      data: [
        { id: 'template-public', visibility: 'public' },
        { id: 'template-private', visibility: 'private' },
      ],
      error: null,
    }],
    challenge_reactions: [{ data: [], error: null }],
  });

  const result = await listReactionSummaries({ db, userId: 'caller' } as never, ['public-1', 'private-1']);
  assertEquals(Object.keys(result), ['public-1']);
});

Deno.test('listReactionSummaries: counts likes/dislikes and picks out the caller\'s own reaction', async () => {
  const db = fakeSupabase({
    challenges: [{ data: [{ id: 'c1', owner_id: 'owner', checklist_template_id: 't1' }], error: null }],
    checklist_templates: [{ data: [{ id: 't1', visibility: 'public' }], error: null }],
    challenge_reactions: [{
      data: [
        { challenge_id: 'c1', user_id: 'caller', reaction: 'like' },
        { challenge_id: 'c1', user_id: 'other-1', reaction: 'like' },
        { challenge_id: 'c1', user_id: 'other-2', reaction: 'dislike' },
      ],
      error: null,
    }],
  });

  const result = await listReactionSummaries({ db, userId: 'caller' } as never, ['c1']);
  assertEquals(result.c1, { likes: 2, dislikes: 1, myReaction: 'like' });
});

Deno.test('listReactionSummaries: returns an empty map for an empty input, without querying', async () => {
  const db = fakeSupabase({});
  assertEquals(await listReactionSummaries({ db, userId: 'caller' } as never, []), {});
});
