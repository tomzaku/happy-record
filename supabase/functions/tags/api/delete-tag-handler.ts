// `DELETE /tags/:id` — idempotent, always the caller's own row.

import { deleteTag } from '../repository/tags-repository.ts';
import type { Ctx } from './tags-context.ts';

export async function deleteTagHandler({ db, userId, id }: Ctx) {
  await deleteTag(db, userId, id!);
  return { ok: true };
}
