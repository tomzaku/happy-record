// Business logic for `tags`, between `api/` and `repository/tags-repository.ts` — no real
// cross-user visibility decision here, so this stays a thin pass-through, but `api/` still never
// queries the DB directly: it always goes through this layer.

import { fetchTags, removeTag, upsertTag } from '../repository/tags-repository.ts';
import type { Ctx } from '../api/tags-context.ts';

export function listTags({ db, userId }: Ctx): Promise<Record<string, unknown>[]> {
  return fetchTags(db, userId);
}

export function saveTag({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  return upsertTag(db, userId, row);
}

export function deleteTag({ db, userId }: Ctx, id: string): Promise<void> {
  return removeTag(db, userId, id);
}
