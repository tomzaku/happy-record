// `GET /tags` — always the caller's own, nothing to compose a `checkPermission` around.

import { toTag } from '../../../dto/tags/tags-dto.ts';
import { fetchTags } from '../repository/tags-repository.ts';
import type { Ctx } from './tags-context.ts';

export async function listTagsHandler({ db, userId }: Ctx) {
  const rows = await fetchTags(db, userId);
  return { tags: rows.map(toTag) };
}
