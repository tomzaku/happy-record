// Unit tests for `checkCanReadMedia`/`checkCanDeleteMedia` — the two `checkPermission` functions
// this resource's `GET`/`DELETE /:id` routes compose against. See `media-repository.test.ts` for
// the peer-visibility join itself; these tests cover the higher-level decision (owner vs. unknown
// id vs. not-yet-linked vs. peer) that wraps it.

import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkCanDeleteMedia, checkCanReadMedia } from './media-access-service.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { ApiError } from '../../../shared/cors.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

const mediaRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'media-1',
  user_id: 'owner',
  kind: 'photo',
  storage_provider: 'supabase',
  storage_path: 'owner/media-1.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 1000,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  expires_at: '2026-09-21T00:00:00.000Z',
  ...overrides,
});

Deno.test('checkCanReadMedia: the owner is always allowed', async () => {
  const db = fakeSupabase({ media: [{ data: mediaRow(), error: null }] });
  const row = await checkCanReadMedia({ db, userId: 'owner', id: 'media-1' } as never);
  assertEquals(row.id, 'media-1');
});

Deno.test('checkCanReadMedia: an unknown id is a 404, not a 403', async () => {
  const db = fakeSupabase({ media: [{ data: null, error: null }] });
  await assertRejects(
    () => checkCanReadMedia({ db, userId: 'someone', id: 'nope' } as never),
    ApiError,
  );
});

Deno.test('checkCanReadMedia: not owned and not yet linked to any checklist record is forbidden', async () => {
  const db = fakeSupabase({
    media: [{ data: mediaRow(), error: null }],
    checklist_records: [{ data: null, error: null }],
  });
  await assertRejects(
    () => checkCanReadMedia({ db, userId: 'stranger', id: 'media-1' } as never),
    ForbiddenError,
  );
});

Deno.test('checkCanReadMedia: a fellow participant is allowed once share_records is on', async () => {
  const db = fakeSupabase({
    media: [{ data: mediaRow(), error: null }],
    checklist_records: [{ data: { checklist_template_id: 'template-1' }, error: null }],
    challenge_participants: [
      { data: [{ challenge_id: 'c1' }], error: null },
      { data: [{ challenge_id: 'c1' }], error: null },
    ],
    challenges: [{ data: [{ id: 'c1' }], error: null }],
  });
  const row = await checkCanReadMedia({ db, userId: 'peer', id: 'media-1' } as never);
  assertEquals(row.id, 'media-1');
});

Deno.test('checkCanReadMedia: a non-participant is forbidden even once the media is linked to a record', async () => {
  const db = fakeSupabase({
    media: [{ data: mediaRow(), error: null }],
    checklist_records: [{ data: { checklist_template_id: 'template-1' }, error: null }],
    challenge_participants: [{ data: [], error: null }],
  });
  await assertRejects(
    () => checkCanReadMedia({ db, userId: 'stranger', id: 'media-1' } as never),
    ForbiddenError,
  );
});

Deno.test('checkCanDeleteMedia: the owner is allowed', async () => {
  const db = fakeSupabase({ media: [{ data: mediaRow(), error: null }] });
  const row = await checkCanDeleteMedia({ db, userId: 'owner', id: 'media-1' } as never);
  assertEquals(row.id, 'media-1');
});

Deno.test('checkCanDeleteMedia: a non-owner is forbidden, even a fellow challenge participant', async () => {
  const db = fakeSupabase({ media: [{ data: mediaRow(), error: null }] });
  await assertRejects(
    () => checkCanDeleteMedia({ db, userId: 'peer', id: 'media-1' } as never),
    ForbiddenError,
  );
});
