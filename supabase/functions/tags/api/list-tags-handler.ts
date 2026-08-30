// `GET /tags` — always the caller's own, nothing to compose a `checkPermission` around.

import { toTag } from '../model/tags-model.ts';
import type { Ctx } from './tags-context.ts';

export async function listTagsHandler({ db, userId }: Ctx) {
  const { data, error } = await db.from('tags').select('*').eq('user_id', userId).order('name');
  if (error) throw new Error(error.message);
  return { tags: ((data ?? []) as Record<string, unknown>[]).map(toTag) };
}
